package com.bnbu.user.Entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 消息内容实体 - 发件箱模型
 */
@AllArgsConstructor
@NoArgsConstructor
@Data
@TableName("message")
public class Message {

    /**
     * 消息主键ID
     * 使用 MyBatis-Plus 默认的雪花算法生成 Long 型 ID
     */
    @TableId(type = IdType.ASSIGN_ID)
    private Long id;

    /**
     * 发送者ID
     * 对应你系统中的 VARCHAR(23) 散列值
     */
    private String senderId;

    /**
     * 消息正文
     */
    private String content;

    /**
     * 发送时间
     * 使用 LocalDateTime 对应数据库的 DATETIME
     */
    private LocalDateTime createTime;


}