package com.bnbu.user.Service;


import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.bnbu.user.DTO.UserInfoDTO;
import com.bnbu.user.Entity.OrgUnit;
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
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.DigestUtils;

import java.util.List;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

import static javax.management.Query.or;



@Service
public class UserService extends ServiceImpl<UserMapper, User> implements UserServiceIterface  {

    private static final String mailSuffix1 = "@mail.bnbu.edu.cn";
    private static final String mailSuffic2 = "2026career@163.com";
    // 注册验证码 Key 前缀 (例如: mcp:code:register:123456)
    private static final String REDIS_KEY_REGISTER_CODE = "mcp:code:register:";

    // 黑名单 Key 前缀 (例如: mcp:blacklist:user:1001)
    private static final String REDIS_KEY_BLACKLIST = "mcp:blacklist:user:";

    @Resource
    private StringRedisTemplate stringRedisTemplate;

    @Autowired
    private MailServiceImple mailServiceImple;

    @Autowired
    RoleMapper roleMapper;

    @Autowired
    UserRoleMapper userRoleMapper;

    @Resource
    JwtUtils jwtUtils;


    @Override
    public String login(String username, String password) {

        if(username == null || username.isEmpty()|| password == null || password.isEmpty()){
            throw new RuntimeException("please enter your username and password");
        }
        User user = this.getOne(new QueryWrapper<User>()
                .eq("username",username)
                .or()
                .eq("email",username)
        );
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

        // 5. 全部校验通过！调用你的 JwtUtil 生成 Token
        // 把用户的唯一 ID 塞进 Token 的载荷中

        return jwtUtils.generateToken(user.getId(),username, this.getBaseMapper().getRoleCodesByUserId(user.getId()));
    }

    @Override
    public UserInfoDTO getUserInfo(String username) {
        User user = this.getOne(new QueryWrapper<User>()
                .eq("username", username)
                .or()
                .eq("email", username)
        );

        if (user == null) {
            throw new RuntimeException("用户不存在");
        }

        String userId = user.getId();
        if (user == null) throw new RuntimeException("用户不存在");
        List<String> roles = baseMapper.getRoleCodesByUserId(userId);
        List<String> perms = baseMapper.getPermissionsByUserId(userId);
        List<OrgUnit> orgUnit = baseMapper.getOrgUnitsByUserId(userId);

        UserInfoDTO userInfoDTO = new UserInfoDTO();
        userInfoDTO.setUser(user);
        userInfoDTO.setPermissions(perms);
        userInfoDTO.setRoles(roles);
        userInfoDTO.setOrgUnits(orgUnit);

        return userInfoDTO;
    }

    @Override
    public void updateInfo(User user) {
        if (user.getId() == null || user.getId().isEmpty()) {
            throw new RuntimeException("User ID field uncompleted，cannot update");
        }
        user.setPasswordHash(null);  // 密码只能走专门的"修改密码"接口
        user.setStatus(null);        // 状态(封号/解封)只能由管理员操作
        user.setIsDeleted(null);     // 逻辑删除标志
        user.setEmail(null);         // 邮箱是唯一标识，通常不允许随便改，或者需要验证原邮箱
        user.setUsername(null);
        this.updateById(user);
    }

    @Override
    public boolean register(String emailAccount) {
        if(emailAccount == null ||!(emailAccount.endsWith(mailSuffix1)||emailAccount.endsWith(mailSuffic2))){
            throw new RuntimeException("People who are not BNBU staff or students are unauthorized");
        }
        long emailNums = this.count(new QueryWrapper<User>().eq("email",emailAccount));
        if(emailNums > 0 ){
            throw new RuntimeException("Already registered! Please Login");
        }
        int code = (int) ((Math.random()*9+1)*100000);
        String redisKey = REDIS_KEY_REGISTER_CODE + emailAccount;
        stringRedisTemplate.opsForValue().set(redisKey, String.valueOf(code),5, TimeUnit.MINUTES);
        mailServiceImple.sendRegisterMail(emailAccount,code);
        return true;
    }

    @Transactional
    @Override
    public boolean verify(User user,String code){
        if (user.getEmail() == null || code == null){
            throw new RuntimeException("filed uncompleted");
        }
        String redisKey = REDIS_KEY_REGISTER_CODE + user.getEmail();
        String codeInRedis = stringRedisTemplate.opsForValue().get(redisKey);

        if(codeInRedis == null){
            throw new RuntimeException("Verification Expired, Please fetch again");
        }
        if(!codeInRedis.equals(code)){
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
                .eq("role_code", "STUDENT")
        );
        if(studentRole == null){
            throw new RuntimeException("System error,no student role");
        }
        UserRole userRole = new UserRole();
        userRole.setUserId(user.getId());
        userRole.setRoleId(studentRole.getId());
        userRoleMapper.insert(userRole);
        return true;
    }
}
