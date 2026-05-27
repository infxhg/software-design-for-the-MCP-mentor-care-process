package com.bnbu.user.Controller;


import com.bnbu.user.DTO.EnsureUserRequest;
import com.bnbu.user.DTO.NotifyEmailRequest;
import com.bnbu.user.DTO.RecordOperationLogRequest;
import com.bnbu.user.DTO.RegisterVerifyDTO;
import com.bnbu.user.DTO.Result;
import com.bnbu.user.Entity.User;
import com.bnbu.user.Service.OperationLogService;
import com.bnbu.user.Service.UserServiceIterface;
import com.bnbu.user.Utils.JavaMailUtils.MailService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController()
@RequestMapping("/api/user")
public class UserController {

    @Autowired
    UserServiceIterface userService;

    @Autowired
    OperationLogService operationLogService;

    @Autowired
    MailService mailService;

    @PostMapping("/register")
    public Result register(@RequestParam("emailAccount") String emailAccount){
        if(userService.register(emailAccount)){
            return Result.success("Verification code has been sent", 200);
        } else  {
            return Result.error("Invalid Email");
        }
    }

    @PostMapping("/register/verify")
    public Result verifyMail(@RequestBody RegisterVerifyDTO dto) {

        if (userService.verify(dto.getUser(), dto.getVerificationCode())) {
            return Result.success();
        } else {
            return Result.error("Invalid code");
        }
    }

    @GetMapping("/login")
    public Result login(@RequestParam("username")String username,@RequestParam("password") String password){
        String token = userService.login(username,password);
        if(token == null || token.isEmpty()){
            return Result.error("Invalid username or password");
        }else{
            return Result.success("Login successfully",token);
        }
    }

    /**
     * 登出：清除 Redis 权限缓存；学生角色写入 sys_operation_log（action=LOGOUT）。
     * 需经网关携带 Authorization: Bearer {token}（网关注入 X-User-Id）。
     */
    @PostMapping("/logout")
    public Result logout(@RequestHeader(value = "X-User-Id", required = false) String currentUserId) {
        try {
            userService.logout(currentUserId);
            return Result.success("Logout successfully", null);
        } catch (RuntimeException e) {
            return Result.error(e.getMessage());
        }
    }

    @PreAuthorize("hasRole('ADMIN') or hasAuthority('user:update')")
    @PostMapping("/updateInfo")
    public Result updateInfo(HttpServletRequest request, @RequestBody User user ){
        String currentUserId = request.getHeader("X-User-Id");
        user.setId(currentUserId);
        userService.updateInfo(user);
        return Result.success();
    }

    @GetMapping("/userInfo")
    public Result getUserInfo(
            @RequestHeader(value = "X-User-Id", required = false) String currentUserId,
            @RequestParam("username") String username) {
        try {
            return Result.success("get info successfully", userService.getUserInfoForCaller(currentUserId, username));
        } catch (RuntimeException e) {
            return Result.error(e.getMessage());
        }
    }

    @GetMapping("/internal/user/{userId}")
    @PreAuthorize("permitAll()")
    public Result getUserByIdInternal(@PathVariable("userId") String userId) {
        User user = userService.getUserById(userId);
        if (user == null) {
            return Result.error("用户不存在");
        }
        user.setPasswordHash(null);
        return Result.success("Successfully get one user", user);
    }

    @PostMapping("/internal/notify-email")
    @PreAuthorize("permitAll()")
    public Result notifyEmail(@RequestBody NotifyEmailRequest request) {
        try {
            mailService.sendNotificationMail(request.getTo(), request.getSubject(), request.getBody());
            return Result.success("Notification sent", null);
        } catch (Exception e) {
            // Demo：记录失败但不阻断业务
            return Result.success("Notification logged (mail send failed: " + e.getMessage() + ")", null);
        }
    }

    @GetMapping("/students/all")
    @PreAuthorize("hasAuthority('ROLE_SUPPORT_STAFF')")
    public Result getAllStudents(@RequestHeader(value = "X-User-Id", required = false) String currentUserId) {
        List<User> students = userService.getAllStudents();
        if (currentUserId != null && !currentUserId.isBlank()) {
            User operator = userService.getUserById(currentUserId);
            String username = operator != null ? operator.getUsername() : currentUserId;
            operationLogService.record(currentUserId, username,
                    com.bnbu.user.Common.OperationLogActions.VIEW_ALL_STUDENTS, "Fetched all students");
        }
        // 也可以将 students 的 PasswordHash 手动设置为 null 以防数据泄露
        students.forEach(student -> student.setPasswordHash(null));
        return Result.success("Successfully fetched all students", students);
    }

    /**
     * 供组织服务调用：在指定的 ID 范围内，根据角色和关键字模糊搜索用户
     */

    @PostMapping("/internal/ensure-user")
    @PreAuthorize("permitAll()")
    public Result ensureUser(@RequestBody EnsureUserRequest request) {
        User user = userService.ensureUser(request);
        user.setPasswordHash(null);
        return Result.success("User ensured", user);
    }

    @PostMapping("/internal/operation-log")
    @PreAuthorize("permitAll()")
    public Result recordOperationLog(@RequestBody RecordOperationLogRequest request) {
        operationLogService.record(
                request.getUserId(),
                request.getUsername(),
                request.getAction(),
                request.getDetail());
        return Result.success("Log recorded", null);
    }

    @PostMapping("/search/by-conditions")
    @PreAuthorize("permitAll()")
    public Result searchUsersByConditions(@RequestBody com.bnbu.user.DTO.UserSearchDTO searchDTO) {
        List<com.bnbu.user.DTO.UserRemoteDTO> users = userService.searchUsers(searchDTO);
        return Result.success("查询成功", users);
    }

    /**
     * 供组织服务 Feign 调用：根据用户 ID 精确查询单个用户
     * GET /api/user/internal/student/{studentId}
     */
    @GetMapping("/internal/student/{studentId}")
    @PreAuthorize("permitAll()")
    public Result getStudentById(@PathVariable("studentId") String studentId) {
        try {
            User user = userService.requireStudentUser(studentId);
            user.setPasswordHash(null);
            return Result.success("查询成功", user);
        } catch (RuntimeException e) {
            return Result.error(e.getMessage());
        }
    }

}

