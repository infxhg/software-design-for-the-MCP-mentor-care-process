package com.bnbu.user.DTO;

import lombok.Data;
import java.util.List;

@Data
public class SendMessageDTO {
    // 接收者列表 (前端传数组，比如 ["HashID1", "HashID2"])
    private List<String> recipientIds;
    // 消息正文
    private String content;
    // 如果是发内部系统消息，前端需要传这个字段
    private String internalCaseId;
}