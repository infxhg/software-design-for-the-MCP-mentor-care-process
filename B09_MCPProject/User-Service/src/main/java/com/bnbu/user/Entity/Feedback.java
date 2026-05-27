package com.bnbu.user.Entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("sys_feedback")
public class Feedback {
    @TableId(type = IdType.ASSIGN_UUID)
    private String id;
    private String userId;
    private String content;
    private LocalDateTime createTime;
}
