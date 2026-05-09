package com.bnbu.user.Controller;


import com.bnbu.user.DTO.RegisterVerifyDTO;
import com.bnbu.user.DTO.Result;
import com.bnbu.user.Entity.User;
import com.bnbu.user.Service.UserService;
import com.bnbu.user.Service.UserServiceIterface;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

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


}
