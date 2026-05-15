package com.bnbu.mentoring.Service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.bnbu.mentoring.Entity.McpRecord;

public interface McpRecordService extends IService<McpRecord> {
    /**
     * 导师编辑/提交访谈记录
     * @param record 访谈记录信息
     * @param currentMentorId 当前登录的导师ID，用于防越权校验
     * @return 成功与否
     */
    boolean saveOrUpdateRecord(McpRecord record, String currentMentorId);
}
