package com.bnbu.organizational.Entity;

import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.baomidou.mybatisplus.annotation.IdType;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 导师附加信息表 (用于存储 Office 等特定角色属性)
 */
@Data
@TableName("sys_mentor_info")
public class SysMentorInfo {

    /**
     * 用户ID (对应 User-Service 中的用户唯一标识)
     * 这里不使用自动生成策略，因为 ID 是由外部（用户服务）提供的
     */
    @TableId(type = IdType.INPUT)
    private String userId;

    /**
     * 导师办公室地址 (例如: T1-102)
     */
    private String office;

    /**
     * 最后更新时间
     */
    private LocalDateTime updateTime;
}
