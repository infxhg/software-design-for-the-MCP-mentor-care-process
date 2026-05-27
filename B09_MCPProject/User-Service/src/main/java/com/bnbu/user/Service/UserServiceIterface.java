package com.bnbu.user.Service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.bnbu.user.DTO.CreateFacultyConsultantRequest;
import com.bnbu.user.DTO.EnsureUserRequest;
import com.bnbu.user.DTO.FacultyConsultantVO;
import com.bnbu.user.DTO.UpdateFacultyConsultantRequest;
import com.bnbu.user.DTO.UserInfoDTO;
import com.bnbu.user.Entity.User;

import java.util.List;

public interface UserServiceIterface extends IService<User> {

    public String login(String username,String password);

    void logout(String userId);

    public UserInfoDTO getUserInfo(String userId);

    UserInfoDTO getUserInfoForCaller(String currentUserId, String username);

    public void updateInfo(User user);

    public boolean register(String emailAccount);

    public boolean verify(User user, String code);

    public User getUserById(String UserId);

    /** 校验用户存在且拥有 STUDENT 角色，否则抛异常 */
    User requireStudentUser(String studentId);

    public List<User> getAllStudents();

    public List<com.bnbu.user.DTO.UserRemoteDTO> searchUsers(com.bnbu.user.DTO.UserSearchDTO searchDTO);

    List<FacultyConsultantVO> listAllFacultyConsultants();

    FacultyConsultantVO getFacultyConsultantById(String id);

    FacultyConsultantVO createFacultyConsultant(CreateFacultyConsultantRequest request);

    FacultyConsultantVO updateFacultyConsultant(String id, UpdateFacultyConsultantRequest request);

    void deleteFacultyConsultant(String id);

    List<FacultyConsultantVO> listAllSupportingStaff();

    FacultyConsultantVO getSupportingStaffById(String id);

    FacultyConsultantVO createSupportingStaff(CreateFacultyConsultantRequest request);

    FacultyConsultantVO updateSupportingStaff(String id, UpdateFacultyConsultantRequest request);

    void deleteSupportingStaff(String id);

    User ensureUser(EnsureUserRequest request);
}
