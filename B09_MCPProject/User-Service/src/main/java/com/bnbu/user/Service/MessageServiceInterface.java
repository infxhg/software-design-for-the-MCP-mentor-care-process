package com.bnbu.user.Service;

import com.bnbu.user.Entity.Message;

import java.util.List;



import com.bnbu.user.Entity.Message;
import java.util.List;

public interface MessageServiceInterface {

    void sendMessage(String senderId, List<String> recipientIds, String content);

    void sendInternalMessage(String senderId, List<String> recipientIds, String internalCaseID);

    List<Message> getAllUserMessage(String userId);

    Integer getUnreadMessageNumber(String userId);

    // 💡 修正了这里的参数：传入具体的信件ID，以及当前登录的用户ID（用于权限校验）
    Message getOneMessage(Long messageId, String userId);
}