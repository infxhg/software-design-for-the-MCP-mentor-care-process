package com.bnbu.user.Controller;


import com.bnbu.user.DTO.RegisterVerifyDTO;
import com.bnbu.user.DTO.Result;
import com.bnbu.user.Entity.User;
import com.bnbu.user.Service.UserServiceIterface;
import jakarta.servlet.http.HttpServletRequest;
import org.apache.ibatis.annotations.Param;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController()
@RequestMapping("/api/user")
public class UserController {

    @Autowired
    UserServiceIterface userService;

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

    @PreAuthorize("hasRole('ADMIN') or hasAuthority('user:update')")
    @PostMapping("/updateInfo")
    public Result updateInfo(HttpServletRequest request, @RequestBody User user ){
        String currentUserId = request.getHeader("X-User-Id");
        user.setId(currentUserId);
        userService.updateInfo(user);
        return Result.success();
    }

    @GetMapping("/userInfo")
    public Result getUserInfo(@RequestParam("username")String username){
        return Result.success("get info successfully",userService.getUserInfo(username));
    }

    @GetMapping("/internal/userInfo")
    @PreAuthorize("permitAll()")
    public Result getInternalUserInfo(@RequestHeader("X-User-Id") String targetUserId,@Param("userId") String userId){
        return Result.success("Successfully get one user",userService.getUserById(userId));
    }

    @GetMapping("/students/all")
    @PreAuthorize("permitAll()")
    public Result getAllStudents() {
        List<User> students = userService.getAllStudents();
        // 也可以将 students 的 PasswordHash 手动设置为 null 以防数据泄露
        students.forEach(student -> student.setPasswordHash(null));
        return Result.success("Successfully fetched all students", students);
    }

    /**
     * 供组织服务调用：在指定的 ID 范围内，根据角色和关键字模糊搜索用户
     */

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
        User user = userService.getUserById(studentId);
        if (user == null) {
            return Result.error("用户不存在");
        }
        user.setPasswordHash(null); // 脱敏，不返回密码
        return Result.success("查询成功", user);
    }

}

