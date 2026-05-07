package com.bnbu.user.Service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.bnbu.user.DTO.UserInfoDTO;
import com.bnbu.user.Entity.User;
import io.lettuce.core.dynamic.annotation.Param;

public interface UserServiceIterface extends IService<User> {

    public String login(String username,String password);

    public UserInfoDTO getUserInfo(String userId);

    public void updateInfo(User user);

    public boolean register(String emailAccount);

    public boolean verify(User user, String code);
}
