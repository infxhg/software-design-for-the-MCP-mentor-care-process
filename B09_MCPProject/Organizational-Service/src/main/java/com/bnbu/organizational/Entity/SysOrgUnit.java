package com.bnbu.organizational.Entity;

import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("sys_org_unit")
public class SysOrgUnit {

    // 💡 修复1：明确告诉它主键在数据库里的列名叫 "id"
    // 即使你的 Java 属性名叫 unitId，只要加上这个注解就能正确映射
    @TableId("id")
    private String unitId; // 如果你这里原本就写的 private String id; 那上面也同样加 @TableId("id") 即可

    private String name;

    private String parentId;

    // 💡 修复2：明确告诉它类型在数据库里的列名叫 "type"
    @TableField("type")
    private String unitType; // 同理，如果这里原本叫 type，也加上 @TableField("type") 以防万一

    private LocalDateTime createTime;
}