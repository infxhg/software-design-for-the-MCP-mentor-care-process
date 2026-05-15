package com.bnbu.mentoring.Service;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.bnbu.mentoring.Entity.McpRecord;
import com.bnbu.mentoring.Mapper.McpRecordMapper;
import org.springframework.stereotype.Service;

import java.util.Date;

@Service
public class McpRecordServiceImpl extends ServiceImpl<McpRecordMapper, McpRecord> implements McpRecordService {

    @Override
    public boolean saveOrUpdateRecord(McpRecord record, String currentMentorId) {
        // 如果 recordId 不为空，说明是更新（编辑现有的）
        if (record.getRecordId() != null && !record.getRecordId().isEmpty()) {
            McpRecord existRecord = this.getById(record.getRecordId());
            if (existRecord == null) {
                throw new RuntimeException("该访谈记录不存在");
            }
            // 防越权拦截：只能编辑自己提交的访谈记录
            if (!existRecord.getMentorId().equals(currentMentorId)) {
                throw new RuntimeException("无权编辑其他导师的访谈记录");
            }
            // 导师可能试图修改不允许修改的字段，这里可以选择性覆盖
            existRecord.setInterviewDate(record.getInterviewDate());
            existRecord.setInterviewTime(record.getInterviewTime());
            existRecord.setProblemStatement(record.getProblemStatement());
            existRecord.setInterviewSummary(record.getInterviewSummary());
            existRecord.setFollowupAction(record.getFollowupAction());
            return this.updateById(existRecord);
        } else {
            // 新增记录
            // 确保 mentorId 是当前登录的人（防止前端乱传）
            record.setMentorId(currentMentorId);
            if (record.getCreateTime() == null) {
                record.setCreateTime(new Date());
            }
            return this.save(record);
        }
    }
}
