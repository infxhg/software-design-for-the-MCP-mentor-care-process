package com.bnbu.user.Service;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.bnbu.user.DTO.CreateFacultyConsultantRequest;
import com.bnbu.user.DTO.EnsureUserRequest;
import com.bnbu.user.DTO.FacultyConsultantVO;
import com.bnbu.user.DTO.UpdateFacultyConsultantRequest;
import com.bnbu.user.DTO.UserInfoDTO;
import com.bnbu.user.Common.RoleCodeEnum;
import com.bnbu.user.Entity.Role;
import com.bnbu.user.Entity.User;
import com.bnbu.user.Entity.UserRole;
import com.bnbu.user.Mapper.RoleMapper;
import com.bnbu.user.Mapper.UserMapper;
import com.bnbu.user.Mapper.UserRoleMapper;
import com.bnbu.user.Utils.JavaMailUtils.MailServiceImple;
import com.bnbu.user.Utils.JwtUtils.JwtUtils;
import jakarta.annotation.Resource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.DigestUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Service
public class UserService extends ServiceImpl<UserMapper, User> implements UserServiceIterface {

    private static final String mailSuffix1 = "@mail.bnbu.edu.cn";
    private static final String mailSuffic2 = "2026career@163.com";
    // 注册验证码 Key 前缀 (例如: mcp:code:register:123456)
    private static final String REDIS_KEY_REGISTER_CODE = "mcp:code:register:";

    // 黑名单 Key 前缀 (例如: mcp:blacklist:user:1001)
    private static final String REDIS_KEY_BLACKLIST = "mcp:blacklist:user:";

    @Autowired
    private StringRedisTemplate stringRedisTemplate;

    @Autowired
    private MailServiceImple mailServiceImple;

    @Autowired
    RoleMapper roleMapper;

    @Autowired
    UserRoleMapper userRoleMapper;

    @Resource
    JwtUtils jwtUtils;
    @Autowired
    private UserMapper userMapper;

    @Autowired
    private OperationLogService operationLogService;

    @Qualifier("redisTemplate")

    @Override
    public String login(String username, String password) {
        if (username == null || username.isEmpty() || password == null || password.isEmpty()) {
            throw new RuntimeException("please enter your username and password");
        }
        User user = this.getOne(new QueryWrapper<User>()
                .and(w -> w.eq("username", username).or().eq("email", username))
                .eq("is_deleted", 0));
        if (user == null) {
            throw new RuntimeException("账号或密码错误");
        }

        // 3. 密码比对：将前端传来的明文密码用同样的 MD5 算法加密，然后与数据库密文比对
        String md5Password = DigestUtils.md5DigestAsHex(password.getBytes());
        if (!user.getPasswordHash().equals(md5Password)) {
            throw new RuntimeException("账号或密码错误");
        }

        // 4. 账号状态拦截 (防止被封禁的用户登录)
        if (user.getStatus() == null || user.getStatus() == 0) {
            throw new RuntimeException("该账号已被封禁，请联系管理员");
        }

        // 5. 全部校验通过 调用 JwtUtil 生成 Token
        // 把用户的唯一 ID 塞进 Token 的载荷中

        String userId = user.getId();
        List<String> roles = baseMapper.getRoleCodesByUserId(userId);
        String token = jwtUtils.generateToken(userId, roles);

        List<String> perms = baseMapper.getPermissionsByUserId(userId);

        List<String> securityAuthorities = new ArrayList<>();
        if (roles != null && !roles.isEmpty()) {
            for (String role : roles) {
                // 存入 Redis 的格式变成 "ROLE_ADMIN"
                securityAuthorities.add("ROLE_" + role.toUpperCase());
            }
        }

        if (perms != null && !perms.isEmpty()) {
            securityAuthorities.addAll(perms);

        }
        if (!securityAuthorities.isEmpty()) {
            String redisKey = "auth:perms:" + userId;
            stringRedisTemplate.opsForSet().add(redisKey, securityAuthorities.toArray(new String[0]));
            stringRedisTemplate.expire(redisKey, 2, TimeUnit.HOURS);
        }
        operationLogService.recordLogin(user);
        return token;
    }

    @Override
    public void logout(String userId) {
        if (userId == null || userId.isBlank()) {
            throw new RuntimeException("未获取到当前登录用户");
        }
        User user = getUserById(userId.trim());
        if (user == null) {
            throw new RuntimeException("用户不存在");
        }
        stringRedisTemplate.delete("auth:perms:" + userId.trim());
        List<String> roles = baseMapper.getRoleCodesByUserId(userId.trim());
        if (operationLogService.hasStudentRole(roles)) {
            operationLogService.recordStudentLogout(user);
        }
    }

    @Override
    public UserInfoDTO getUserInfo(String username) {
        return buildUserInfoDTO(findActiveUserByAccount(username));
    }

    @Override
    public UserInfoDTO getUserInfoForCaller(String currentUserId, String username) {
        User target = findActiveUserByAccount(username);
        if (currentUserId == null || currentUserId.isBlank()) {
            throw new RuntimeException("未获取到当前登录用户");
        }
        boolean isSelf = currentUserId.equals(target.getId());
        boolean isAdmin = hasAuthority("ROLE_ADMIN");
        if (!isSelf && !isAdmin) {
            throw new RuntimeException("无权查看其他用户的账号信息");
        }
        return buildUserInfoDTO(target);
    }

    private User findActiveUserByAccount(String account) {
        User user = this.getOne(new QueryWrapper<User>()
                .and(w -> w.eq("username", account).or().eq("email", account))
                .eq("is_deleted", 0));
        if (user == null) {
            throw new RuntimeException("用户不存在");
        }
        return user;
    }

    private UserInfoDTO buildUserInfoDTO(User user) {
        String userId = user.getId();
        List<String> roles = baseMapper.getRoleCodesByUserId(userId);
        List<String> perms = baseMapper.getPermissionsByUserId(userId);
        UserInfoDTO userInfoDTO = new UserInfoDTO();
        userInfoDTO.setUser(user);
        userInfoDTO.setPermissions(perms);
        userInfoDTO.setRoles(roles);
        return userInfoDTO;
    }

    private boolean hasAuthority(String authority) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) {
            return false;
        }
        return auth.getAuthorities().stream()
                .anyMatch(a -> authority.equals(a.getAuthority()));
    }

    @Override
    public void updateInfo(User user) {
        if (user.getId() == null || user.getId().isEmpty()) {
            throw new RuntimeException("User ID field uncompleted，cannot update");
        }
        user.setPasswordHash(null); // 密码只能走专门的"修改密码"接口
        user.setStatus(null); // 状态(封号/解封)只能由管理员操作
        user.setIsDeleted(null); // 逻辑删除标志
        user.setEmail(null); // 邮箱是唯一标识，通常不允许随便改，或者需要验证原邮箱
        user.setUsername(null);
        this.updateById(user);
    }

    @Override
    public boolean register(String emailAccount) {
        if (emailAccount == null || !(emailAccount.endsWith(mailSuffix1) || emailAccount.endsWith(mailSuffic2))) {
            throw new RuntimeException("People who are not BNBU staff or students are unauthorized");
        }
        long emailNums = this.count(new QueryWrapper<User>().eq("email", emailAccount));
        if (emailNums > 0) {
            throw new RuntimeException("Already registered! Please Login");
        }
        int code = (int) ((Math.random() * 9 + 1) * 100000);
        String redisKey = REDIS_KEY_REGISTER_CODE + emailAccount;
        stringRedisTemplate.opsForValue().set(redisKey, String.valueOf(code), 5, TimeUnit.MINUTES);
        mailServiceImple.sendRegisterMail(emailAccount, code);
        return true;
    }

    @Transactional
    @Override
    public boolean verify(User user, String code) {
        if (user.getEmail() == null || code == null) {
            throw new RuntimeException("filed uncompleted");
        }
        String redisKey = REDIS_KEY_REGISTER_CODE + user.getEmail();
        String codeInRedis = stringRedisTemplate.opsForValue().get(redisKey);

        if (codeInRedis == null) {
            throw new RuntimeException("Verification Expired, Please fetch again");
        }
        if (!codeInRedis.equals(code)) {
            throw new RuntimeException("Verification incorrect!");
        }
        stringRedisTemplate.delete(redisKey);
        String rawPassword = user.getPasswordHash();
        String md5Password = DigestUtils.md5DigestAsHex(rawPassword.getBytes());
        user.setPasswordHash(md5Password);
        user.setStatus(1);
        user.setIsDeleted(0);
        // 生成唯一的 9 位纯数字 ID（100000000 ~ 999999999）
        String newId = generateUniqueUserId();
        user.setId(newId);
        this.save(user);
        Role studentRole = roleMapper.selectOne(new QueryWrapper<com.bnbu.user.Entity.Role>()
                .eq("role_code", "STUDENT"));
        if (studentRole == null) {
            throw new RuntimeException("System error,no student role");
        }
        UserRole userRole = new UserRole();
        userRole.setUserId(user.getId());
        userRole.setRoleId(studentRole.getId());
        userRoleMapper.insert(userRole);
        return true;
    }

    @Override
    public User getUserById(String userId) {
        return userMapper.selectById(userId);
    }

    @Override
    public List<User> getAllStudents() {
        // 1. 获取 STUDENT 角色的 ID
        Role studentRole = roleMapper.selectOne(new QueryWrapper<Role>()
                .eq("role_code", "STUDENT"));

        // 如果系统中连 STUDENT 角色都没有，直接返回空列表
        if (studentRole == null) {
            return new ArrayList<>();
        }

        // 2. 在 user_role 表中找到所有关联了该角色 ID 的用户记录
        List<UserRole> userRoles = userRoleMapper.selectList(new QueryWrapper<UserRole>()
                .eq("role_id", studentRole.getId()));

        if (userRoles == null || userRoles.isEmpty()) {
            return new ArrayList<>();
        }

        // 3. 提取所有的用户 ID
        List<String> studentIds = userRoles.stream()
                .map(UserRole::getUserId)
                .collect(Collectors.toList());

        // 4. 根据用户 ID 批量查询并返回详细用户信息
        // 建议：如果你有一个 UserDTO，可以在这里把 User 转换为 UserDTO 脱敏后再返回
        return this.listByIds(studentIds);
    }

    @Override
    public List<com.bnbu.user.DTO.UserRemoteDTO> searchUsers(com.bnbu.user.DTO.UserSearchDTO searchDTO) {
        QueryWrapper<User> queryWrapper = new QueryWrapper<>();

        // 1. 过滤 roleCode 对应的 userId
        List<String> targetUserIds = null;
        if (searchDTO.getRoleCode() != null && !searchDTO.getRoleCode().isEmpty()) {
            Role role = roleMapper.selectOne(new QueryWrapper<Role>().eq("role_code", searchDTO.getRoleCode()));
            if (role == null) {
                return new ArrayList<>(); // 角色不存在，返回空
            }
            List<UserRole> userRoles = userRoleMapper
                    .selectList(new QueryWrapper<UserRole>().eq("role_id", role.getId()));
            if (userRoles == null || userRoles.isEmpty()) {
                return new ArrayList<>(); // 该角色下没用户，返回空
            }
            List<String> roleUserIds = userRoles.stream().map(UserRole::getUserId).collect(Collectors.toList());

            // 如果还传了 userIds 限制，取交集
            if (searchDTO.getUserIds() != null && !searchDTO.getUserIds().isEmpty()) {
                targetUserIds = roleUserIds.stream().filter(searchDTO.getUserIds()::contains)
                        .collect(Collectors.toList());
                if (targetUserIds.isEmpty()) {
                    return new ArrayList<>(); // 交集为空
                }
            } else {
                targetUserIds = roleUserIds;
            }
        } else {
            if (searchDTO.getUserIds() != null && !searchDTO.getUserIds().isEmpty()) {
                targetUserIds = searchDTO.getUserIds();
            }
        }

        // 2. 根据 user_id 集合过滤
        if (targetUserIds != null) {
            queryWrapper.in("id", targetUserIds);
        } else if (searchDTO.getUserIds() != null && searchDTO.getUserIds().isEmpty()) {
            // 如果没传 roleCode，且 userIds 传了个空集合
            return new ArrayList<>();
        }

        // 3. 关键字模糊查询 (name LIKE '%keyword%' OR email LIKE '%keyword%')
        if (searchDTO.getKeyword() != null && !searchDTO.getKeyword().isEmpty()) {
            String keyword = searchDTO.getKeyword();
            queryWrapper.and(wrapper -> wrapper.like("real_name", keyword).or().like("email", keyword).or().like("id", keyword));
        }

        // 4. 执行查询
        List<User> users = this.list(queryWrapper);

        // 5. 转换为 DTO 返回
        return users.stream().map(user -> {
            com.bnbu.user.DTO.UserRemoteDTO dto = new com.bnbu.user.DTO.UserRemoteDTO();
            dto.setId(user.getId());
            dto.setUsername(user.getUsername());
            dto.setRealName(user.getRealName());
            dto.setEmail(user.getEmail());
            dto.setPhone(user.getPhone());
            return dto;
        }).collect(Collectors.toList());
    }

    private static final String FACULTY_CONSULTANT_ROLE_CODE = RoleCodeEnum.FACULTY_CONSULTANT.getCode();
    private static final String SUPPORT_STAFF_ROLE_CODE = RoleCodeEnum.SUPPORT_STAFF.getCode();

    @Override
    public List<FacultyConsultantVO> listAllFacultyConsultants() {
        Role consultantRole = getFacultyConsultantRole();
        List<UserRole> userRoles = userRoleMapper.selectList(
                new QueryWrapper<UserRole>().eq("role_id", consultantRole.getId()));
        if (userRoles == null || userRoles.isEmpty()) {
            return new ArrayList<>();
        }
        List<String> userIds = userRoles.stream().map(UserRole::getUserId).collect(Collectors.toList());
        return this.listByIds(userIds).stream()
                .map(this::toFacultyConsultantVO)
                .collect(Collectors.toList());
    }

    @Override
    public FacultyConsultantVO getFacultyConsultantById(String id) {
        User user = requireFacultyConsultantUser(id);
        return toFacultyConsultantVO(user);
    }

    @Transactional
    @Override
    public FacultyConsultantVO createFacultyConsultant(CreateFacultyConsultantRequest request) {
        assertUsernameAvailable(request.getUsername(), null);
        assertEmailAvailable(request.getEmail(), null);

        User user = new User();
        user.setId(generateUniqueUserId());
        user.setUsername(request.getUsername().trim());
        user.setRealName(request.getRealName());
        user.setPhone(request.getPhone());
        user.setEmail(request.getEmail().trim());
        user.setPasswordHash(DigestUtils.md5DigestAsHex(request.getPassword().getBytes()));
        user.setStatus(request.getStatus() != null ? request.getStatus() : 1);
        user.setIsDeleted(0);
        this.save(user);

        bindFacultyConsultantRole(user.getId());
        return toFacultyConsultantVO(user);
    }

    @Transactional
    @Override
    public FacultyConsultantVO updateFacultyConsultant(String id, UpdateFacultyConsultantRequest request) {
        User user = requireFacultyConsultantUser(id);

        if (request.getEmail() != null && !request.getEmail().isBlank()) {
            assertEmailAvailable(request.getEmail().trim(), id);
            user.setEmail(request.getEmail().trim());
        }
        if (request.getRealName() != null) {
            user.setRealName(request.getRealName());
        }
        if (request.getPhone() != null) {
            user.setPhone(request.getPhone());
        }
        if (request.getStatus() != null) {
            user.setStatus(request.getStatus());
        }
        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            user.setPasswordHash(DigestUtils.md5DigestAsHex(request.getPassword().getBytes()));
        }

        this.updateById(user);
        return toFacultyConsultantVO(this.getById(id));
    }

    @Transactional
    @Override
    public void deleteFacultyConsultant(String id) {
        requireFacultyConsultantUser(id);
        userRoleMapper.delete(new QueryWrapper<UserRole>().eq("user_id", id));
        this.removeById(id);
    }

    private Role getFacultyConsultantRole() {
        Role role = roleMapper.selectOne(new QueryWrapper<Role>().eq("role_code", FACULTY_CONSULTANT_ROLE_CODE));
        if (role == null) {
            throw new RuntimeException("System error: FACULTY_CONSULTANT role not found");
        }
        return role;
    }

    private void bindFacultyConsultantRole(String userId) {
        Role role = getFacultyConsultantRole();
        UserRole userRole = new UserRole();
        userRole.setUserId(userId);
        userRole.setRoleId(role.getId());
        userRoleMapper.insert(userRole);
    }

    private User requireFacultyConsultantUser(String userId) {
        User user = this.getById(userId);
        if (user == null) {
            throw new RuntimeException("Faculty consultant not found");
        }
        List<String> roleCodes = baseMapper.getRoleCodesByUserId(userId);
        if (roleCodes == null || !roleCodes.contains(FACULTY_CONSULTANT_ROLE_CODE)) {
            throw new RuntimeException("User is not a faculty consultant");
        }
        return user;
    }

    private void assertUsernameAvailable(String username, String excludeUserId) {
        QueryWrapper<User> wrapper = new QueryWrapper<User>().eq("username", username.trim());
        if (excludeUserId != null) {
            wrapper.ne("id", excludeUserId);
        }
        if (this.count(wrapper) > 0) {
            throw new RuntimeException("Username already exists");
        }
    }

    private void assertEmailAvailable(String email, String excludeUserId) {
        QueryWrapper<User> wrapper = new QueryWrapper<User>().eq("email", email.trim());
        if (excludeUserId != null) {
            wrapper.ne("id", excludeUserId);
        }
        if (this.count(wrapper) > 0) {
            throw new RuntimeException("Email already exists");
        }
    }

    private FacultyConsultantVO toFacultyConsultantVO(User user) {
        FacultyConsultantVO vo = new FacultyConsultantVO();
        vo.setId(user.getId());
        vo.setUsername(user.getUsername());
        vo.setRealName(user.getRealName());
        vo.setPhone(user.getPhone());
        vo.setEmail(user.getEmail());
        vo.setStatus(user.getStatus());
        vo.setCreateTime(user.getCreateTime());
        vo.setUpdateTime(user.getUpdateTime());
        return vo;
    }

    @Override
    public List<FacultyConsultantVO> listAllSupportingStaff() {
        Role staffRole = getRoleByCode(SUPPORT_STAFF_ROLE_CODE);
        List<UserRole> userRoles = userRoleMapper.selectList(
                new QueryWrapper<UserRole>().eq("role_id", staffRole.getId()));
        if (userRoles == null || userRoles.isEmpty()) {
            return new ArrayList<>();
        }
        List<String> userIds = userRoles.stream().map(UserRole::getUserId).collect(Collectors.toList());
        return this.listByIds(userIds).stream()
                .map(this::toFacultyConsultantVO)
                .collect(Collectors.toList());
    }

    @Override
    public FacultyConsultantVO getSupportingStaffById(String id) {
        return toFacultyConsultantVO(requireRoleUser(id, SUPPORT_STAFF_ROLE_CODE));
    }

    @Transactional
    @Override
    public FacultyConsultantVO createSupportingStaff(CreateFacultyConsultantRequest request) {
        assertUsernameAvailable(request.getUsername(), null);
        assertEmailAvailable(request.getEmail(), null);

        User user = new User();
        user.setId(generateUniqueUserId());
        user.setUsername(request.getUsername().trim());
        user.setRealName(request.getRealName());
        user.setPhone(request.getPhone());
        user.setEmail(request.getEmail().trim());
        user.setPasswordHash(DigestUtils.md5DigestAsHex(request.getPassword().getBytes()));
        user.setStatus(request.getStatus() != null ? request.getStatus() : 1);
        user.setIsDeleted(0);
        this.save(user);

        bindRole(user.getId(), SUPPORT_STAFF_ROLE_CODE);
        return toFacultyConsultantVO(user);
    }

    @Transactional
    @Override
    public FacultyConsultantVO updateSupportingStaff(String id, UpdateFacultyConsultantRequest request) {
        User user = requireRoleUser(id, SUPPORT_STAFF_ROLE_CODE);

        if (request.getEmail() != null && !request.getEmail().isBlank()) {
            assertEmailAvailable(request.getEmail().trim(), id);
            user.setEmail(request.getEmail().trim());
        }
        if (request.getRealName() != null) {
            user.setRealName(request.getRealName());
        }
        if (request.getPhone() != null) {
            user.setPhone(request.getPhone());
        }
        if (request.getStatus() != null) {
            user.setStatus(request.getStatus());
        }
        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            user.setPasswordHash(DigestUtils.md5DigestAsHex(request.getPassword().getBytes()));
        }

        this.updateById(user);
        return toFacultyConsultantVO(this.getById(id));
    }

    @Transactional
    @Override
    public void deleteSupportingStaff(String id) {
        requireRoleUser(id, SUPPORT_STAFF_ROLE_CODE);
        userRoleMapper.delete(new QueryWrapper<UserRole>().eq("user_id", id));
        this.removeById(id);
    }

    private Role getRoleByCode(String roleCode) {
        Role role = roleMapper.selectOne(new QueryWrapper<Role>().eq("role_code", roleCode));
        if (role == null) {
            throw new RuntimeException("System error: role not found: " + roleCode);
        }
        return role;
    }

    private void bindRole(String userId, String roleCode) {
        Role role = getRoleByCode(roleCode);
        UserRole userRole = new UserRole();
        userRole.setUserId(userId);
        userRole.setRoleId(role.getId());
        userRoleMapper.insert(userRole);
    }

    private User requireRoleUser(String userId, String roleCode) {
        User user = this.getById(userId);
        if (user == null) {
            throw new RuntimeException("User not found");
        }
        List<String> roleCodes = baseMapper.getRoleCodesByUserId(userId);
        if (roleCodes == null || !roleCodes.stream().anyMatch(roleCode::equalsIgnoreCase)) {
            throw new RuntimeException("User does not have required role: " + roleCode);
        }
        if (user.getStatus() != null && user.getStatus() == 0) {
            throw new RuntimeException("User account is disabled");
        }
        return user;
    }

    @Override
    public User requireStudentUser(String studentId) {
        if (studentId == null || studentId.isBlank()) {
            throw new RuntimeException("studentId is required");
        }
        return requireRoleUser(studentId.trim(), RoleCodeEnum.STUDENT.getCode());
    }

    @Transactional
    @Override
    public User ensureUser(EnsureUserRequest request) {
        if (request.getRoleCode() == null || request.getRoleCode().isBlank()) {
            throw new RuntimeException("roleCode is required");
        }
        String userId = request.getId() != null ? request.getId().trim() : "";
        boolean generatedId = false;
        if (userId.isBlank()) {
            if ("STUDENT".equalsIgnoreCase(request.getRoleCode())) {
                String username = request.getUsername() != null ? request.getUsername().trim() : "";
                if (username.matches("\\d{9}")) {
                    userId = username;
                } else {
                    throw new RuntimeException("STUDENT requires a 9-digit id from import file");
                }
            } else {
                userId = generateUniqueUserId();
                generatedId = true;
            }
        } else if ("STUDENT".equalsIgnoreCase(request.getRoleCode()) && !userId.matches("\\d{9}")) {
            throw new RuntimeException("STUDENT id must be exactly 9 digits");
        }
        // #region agent log
        debugEnsureUserLog(request.getRoleCode(), request.getId(), userId, generatedId);
        // #endregion
        User existing = this.getById(userId);
        if (existing == null) {
            if (request.getUsername() == null || request.getUsername().isBlank()) {
                throw new RuntimeException("username is required for new user");
            }
            assertUsernameAvailable(request.getUsername(), null);
            if (request.getEmail() != null && !request.getEmail().isBlank()) {
                assertEmailAvailable(request.getEmail(), null);
            }
            User user = new User();
            user.setId(userId);
            user.setUsername(request.getUsername().trim());
            user.setRealName(request.getRealName());
            user.setPhone(request.getPhone());
            user.setEmail(request.getEmail());
            String pwd = request.getPassword() != null ? request.getPassword() : "123456";
            user.setPasswordHash(DigestUtils.md5DigestAsHex(pwd.getBytes()));
            user.setStatus(request.getStatus() != null ? request.getStatus() : 1);
            user.setIsDeleted(0);
            this.save(user);
            existing = user;
        } else {
            if (request.getRealName() != null) {
                existing.setRealName(request.getRealName());
            }
            if (request.getEmail() != null && !request.getEmail().isBlank()) {
                assertEmailAvailable(request.getEmail(), userId);
                existing.setEmail(request.getEmail().trim());
            }
            this.updateById(existing);
        }

        List<String> roles = baseMapper.getRoleCodesByUserId(userId);
        if (roles == null || !roles.contains(request.getRoleCode())) {
            bindRole(userId, request.getRoleCode());
        }
        return this.getById(userId);
    }

    /**
     * 生成唯一的 9 位纯数字用户 ID（100000000 ~ 999999999）
     * 采用重试机制防止极低概率的 ID 碰撞
     */
    private String generateUniqueUserId() {
        java.util.Random random = new java.util.Random();
        int maxRetries = 10;
        for (int i = 0; i < maxRetries; i++) {
            // 生成 100000000 ~ 999999999 之间的随机数
            int candidate = 100000000 + random.nextInt(900000000);
            String candidateId = String.valueOf(candidate);
            // 检查数据库中是否已存在该 ID
            if (this.getById(candidateId) == null) {
                return candidateId;
            }
        }
        throw new RuntimeException("系统繁忙，用户 ID 生成失败，请重试");
    }

    // #region agent log
    private static void debugEnsureUserLog(String roleCode, String requestId, String resolvedUserId, boolean generatedId) {
        try {
            String json = String.format(
                    "{\"sessionId\":\"6b255a\",\"hypothesisId\":\"H2\",\"location\":\"UserService.ensureUser\","
                            + "\"message\":\"resolved user id\",\"data\":{\"roleCode\":\"%s\",\"requestId\":\"%s\","
                            + "\"resolvedUserId\":\"%s\",\"generatedId\":%s},\"timestamp\":%d}%n",
                    roleCode != null ? roleCode : "",
                    requestId != null ? requestId : "",
                    resolvedUserId != null ? resolvedUserId : "",
                    generatedId,
                    System.currentTimeMillis());
            java.nio.file.Files.writeString(
                    java.nio.file.Path.of("/Users/houshuoran/IdeaProjects/B09/.cursor/debug-6b255a.log"),
                    json,
                    java.nio.file.StandardOpenOption.CREATE,
                    java.nio.file.StandardOpenOption.APPEND);
        } catch (Exception ignored) {
        }
    }
    // #endregion
}
