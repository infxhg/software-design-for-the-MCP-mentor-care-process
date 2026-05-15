package com.bnbu.user.Service;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.bnbu.user.DTO.UserInfoDTO;
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

    @Qualifier("redisTemplate")

    @Override
    public String login(String username, String password) {
        if (username == null || username.isEmpty() || password == null || password.isEmpty()) {
            throw new RuntimeException("please enter your username and password");
        }
        User user = this.getOne(new QueryWrapper<User>()
                .eq("username", username)
                .or()
                .eq("email", username));
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
        return token;
    }

    @Override
    public UserInfoDTO getUserInfo(String username) {
        User user = this.getOne(new QueryWrapper<User>()
                .eq("username", username)
                .or()
                .eq("email", username));

        if (user == null) {
            throw new RuntimeException("用户不存在");
        }

        String userId = user.getId();
        if (user == null)
            throw new RuntimeException("用户不存在");
        List<String> roles = baseMapper.getRoleCodesByUserId(userId);
        List<String> perms = baseMapper.getPermissionsByUserId(userId);

        UserInfoDTO userInfoDTO = new UserInfoDTO();
        userInfoDTO.setUser(user);
        userInfoDTO.setPermissions(perms);
        userInfoDTO.setRoles(roles);

        return userInfoDTO;
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
            queryWrapper.and(wrapper -> wrapper.like("real_name", keyword).or().like("email", keyword));
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
}
