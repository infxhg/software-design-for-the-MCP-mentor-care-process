package com.bnbu.mentoring.Service;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.bnbu.mentoring.Entity.McpRecord;
import com.bnbu.mentoring.Entity.McpStudentExt;
import com.bnbu.mentoring.Mapper.McpRecordMapper;
import com.bnbu.mentoring.Util.GroupKeyUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.Date;
import java.util.List;

@Service
public class McpRecordServiceImpl extends ServiceImpl<McpRecordMapper, McpRecord> implements McpRecordService {

    @Autowired
    private MentoringAccessService mentoringAccessService;

    @Autowired
    private McpGroupService mcpGroupService;

    @Autowired
    private McpStudentExtService mcpStudentExtService;

    @Override
    public boolean saveOrUpdateRecord(McpRecord record, String currentMentorId) {
        return saveOrUpdateRecord(record, currentMentorId, false);
    }

    @Override
    public boolean saveOrUpdateRecord(McpRecord record, String currentUserId, boolean coordinatorOverride) {
        if (record.getRecordId() != null && !record.getRecordId().isEmpty()) {
            McpRecord existRecord = this.getById(record.getRecordId());
            if (existRecord == null) {
                throw new RuntimeException("该访谈记录不存在");
            }
            if (coordinatorOverride) {
                mentoringAccessService.assertCoordinatorCanAccessStudent(currentUserId, existRecord.getStudentId());
            } else if (!existRecord.getMentorId().equals(currentUserId)) {
                throw new RuntimeException("无权编辑其他导师的访谈记录");
            } else {
                mentoringAccessService.assertMentorOwnsStudent(currentUserId, existRecord.getStudentId());
            }
            existRecord.setInterviewDate(record.getInterviewDate());
            existRecord.setInterviewTime(record.getInterviewTime());
            existRecord.setProblemStatement(record.getProblemStatement());
            existRecord.setInterviewSummary(record.getInterviewSummary());
            existRecord.setFollowupAction(record.getFollowupAction());
            return this.updateById(existRecord);
        } else {
            if (coordinatorOverride) {
                if (record.getStudentId() == null || record.getStudentId().isBlank()) {
                    throw new RuntimeException("studentId is required");
                }
                mentoringAccessService.assertCoordinatorCanAccessStudent(currentUserId, record.getStudentId());
                if (record.getMentorId() == null || record.getMentorId().isBlank()) {
                    throw new RuntimeException("coordinator must specify mentorId when creating a record");
                }
            } else {
                record.setMentorId(currentUserId);
                mentoringAccessService.assertMentorOwnsStudent(currentUserId, record.getStudentId());
            }
            resolveAndApplyGroupIdentity(record, currentUserId, coordinatorOverride);
            if (record.getCreateTime() == null) {
                record.setCreateTime(new Date());
            }
            return this.save(record);
        }
    }

    /**
     * 保存访谈时写入 groupKey（UUID）与 groupId（展示标签）。
     * 优先用请求体；解析失败时从学生 ext 回退。
     */
    private void resolveAndApplyGroupIdentity(McpRecord record, String currentUserId, boolean coordinatorOverride) {
        if (StringUtils.hasText(record.getGroupKey()) && GroupKeyUtils.isOrgUnitUuid(record.getGroupKey())) {
            record.setGroupKey(record.getGroupKey().trim());
            fillGroupLabelFromStudentIfMissing(record);
            return;
        }

        String label = StringUtils.hasText(record.getGroupId()) ? record.getGroupId().trim() : null;
        String groupKey = null;
        String resolverMentorId = coordinatorOverride ? record.getMentorId() : currentUserId;

        if (StringUtils.hasText(label)) {
            if (GroupKeyUtils.isOrgUnitUuid(label)) {
                groupKey = label;
            } else if (StringUtils.hasText(resolverMentorId)) {
                try {
                    groupKey = mcpGroupService.resolveGroupKeyForMentor(label, resolverMentorId);
                } catch (RuntimeException ignored) {
                    // fall through
                }
            }
            if (!StringUtils.hasText(groupKey)) {
                List<String> keys = mcpGroupService.resolveGroupKeysByLabel(label, null);
                if (keys.size() == 1) {
                    groupKey = keys.get(0);
                }
            }
        }

        if (!StringUtils.hasText(groupKey) && StringUtils.hasText(record.getStudentId())) {
            McpStudentExt ext = mcpStudentExtService.getById(record.getStudentId());
            groupKey = mcpGroupService.resolveGroupKeyForStudent(ext);
            if (StringUtils.hasText(groupKey)) {
                if (!StringUtils.hasText(label) && ext != null && StringUtils.hasText(ext.getGroupId())) {
                    record.setGroupId(ext.getGroupId());
                }
                mcpGroupService.persistGroupKeyIfResolved(ext, groupKey);
            }
        }

        if (StringUtils.hasText(groupKey)) {
            record.setGroupKey(groupKey.trim());
            fillGroupLabelFromStudentIfMissing(record);
        }
    }

    private void fillGroupLabelFromStudentIfMissing(McpRecord record) {
        if (StringUtils.hasText(record.getGroupId()) || !StringUtils.hasText(record.getStudentId())) {
            return;
        }
        McpStudentExt ext = mcpStudentExtService.getById(record.getStudentId());
        if (ext != null && StringUtils.hasText(ext.getGroupId())) {
            record.setGroupId(ext.getGroupId());
        }
    }
}
