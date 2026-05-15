package com.bnbu.user.Entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;
import java.time.LocalDateTime;

/**
 * 消息接收映射实体 - 收件箱模型
 */
@Data
@TableName("message_recipient")
public class MessageRecipient {

    /**
     * 映射关系主键ID
     * 对应数据库的 BIGINT AUTO_INCREMENT
     */
    @TableId(type = IdType.AUTO)
    private Long id;

    /**
     * 关联的消息内容ID
     */
    private Long messageId;

    /**
     * 接收者ID
     * 对应你系统中的 VARCHAR(23) 散列值
     */
    private String receiverId;

    /**
     * 阅读状态
     * 0-未读，1-已读
     */
    private Integer isRead;

    /**
     * 阅读时间
     */
    private LocalDateTime readTime;
}