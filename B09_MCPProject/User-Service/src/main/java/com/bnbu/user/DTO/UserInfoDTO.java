package com.bnbu.user.DTO;


import com.bnbu.user.Entity.User;
import lombok.Data;

import java.util.List;

@Data
public class UserInfoDTO {
    private User user;
    private List<String> roles;
    private List<String> permissions;

}
