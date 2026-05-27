package com.bnbu.mentoring.Service;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.bnbu.mentoring.Client.UserServiceClient;
import com.bnbu.mentoring.DTO.CreateSlotRequest;
import com.bnbu.mentoring.DTO.NotifyEmailRequest;
import com.bnbu.mentoring.DTO.Result;
import com.bnbu.mentoring.Entity.AppointmentSlot;
import com.bnbu.mentoring.Mapper.AppointmentSlotMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
public class AppointmentService extends ServiceImpl<AppointmentSlotMapper, AppointmentSlot> {

    @Autowired
    private MentoringAccessService mentoringAccessService;

    @Autowired
    private McpGroupService mcpGroupService;

    @Autowired
    private UserServiceClient userServiceClient;

    // ────────────────────────────────────────────────────────────────────────
    // 核心业务方法
    // ────────────────────────────────────────────────────────────────────────

    @Transactional
    public List<AppointmentSlot> createSlots(String mentorId, CreateSlotRequest request) {
        if (request.getSlotDate() == null || request.getStartTimes() == null || request.getStartTimes().isEmpty()) {
            throw new RuntimeException("slotDate and startTimes are required");
        }
        List<AppointmentSlot> created = new ArrayList<>();
        for (String start : request.getStartTimes()) {
            String end = addMinutes(start, 30);
            AppointmentSlot slot = new AppointmentSlot();
            slot.setMentorId(mentorId);
            slot.setSlotDate(request.getSlotDate());
            slot.setStartTime(start);
            slot.setEndTime(end);
            slot.setStatus("AVAILABLE");
            slot.setCreateTime(LocalDateTime.now());
            this.save(slot);
            created.add(slot);
        }

        // 创建时段后，异步通知导师所在组内所有学生
        sendInviteEmailsToStudents(mentorId, request);

        return created;
    }

    public List<AppointmentSlot> listAvailableByMentor(String mentorId) {
        return this.lambdaQuery()
                .eq(AppointmentSlot::getMentorId, mentorId)
                .eq(AppointmentSlot::getStatus, "AVAILABLE")
                .orderByAsc(AppointmentSlot::getSlotDate)
                .orderByAsc(AppointmentSlot::getStartTime)
                .list();
    }

    /** 导师查看自己发布的全部时段（含已预约、已取消等，用于面谈安排页「My Slots」）。 */
    public List<AppointmentSlot> listSlotsByMentor(String mentorId) {
        return this.lambdaQuery()
                .eq(AppointmentSlot::getMentorId, mentorId)
                .orderByAsc(AppointmentSlot::getSlotDate)
                .orderByAsc(AppointmentSlot::getStartTime)
                .list();
    }

    public List<AppointmentSlot> listAvailableForStudent(String studentId, String mentorId) {
        if (!mentoringAccessService.isStudentInMentorGroups(mentorId, studentId)) {
            throw new RuntimeException("权限不足：您只能查看本组导师的可用时段");
        }
        return listAvailableByMentor(mentorId);
    }

    @Transactional
    public AppointmentSlot confirmSlot(String studentId, String slotId) {
        AppointmentSlot slot = this.getById(slotId);
        if (slot == null) {
            throw new RuntimeException("Slot not found");
        }
        if (!"AVAILABLE".equals(slot.getStatus())) {
            throw new RuntimeException("Time conflict: please choose another slot");
        }
        if (!mentoringAccessService.isStudentInMentorGroups(slot.getMentorId(), studentId)) {
            throw new RuntimeException("权限不足：您只能预约本组导师的时段");
        }
        slot.setStudentId(studentId);
        slot.setStatus("BOOKED");
        this.updateById(slot);

        // 预约确认后，向 Mentor 和学生各发一封确认邮件
        sendConfirmationEmails(slot);

        return slot;
    }

    @Transactional
    public AppointmentSlot setVenue(String mentorId, String slotId, String venue) {
        if (venue == null || venue.isBlank()) {
            throw new RuntimeException("Venue cannot be empty");
        }
        AppointmentSlot slot = this.getById(slotId);
        if (slot == null || !mentorId.equals(slot.getMentorId())) {
            throw new RuntimeException("Slot not found or access denied");
        }
        slot.setVenue(venue.trim());
        this.updateById(slot);
        return slot;
    }

    @Transactional
    public void cancelSlot(String mentorId, String slotId) {
        AppointmentSlot slot = this.getById(slotId);
        if (slot == null || !mentorId.equals(slot.getMentorId())) {
            throw new RuntimeException("Slot not found or access denied");
        }
        slot.setStatus("CANCELLED");
        this.updateById(slot);
    }

    // ────────────────────────────────────────────────────────────────────────
    // 邮件通知：Mentor 发布时段 → 通知组内所有学生来预约
    // ────────────────────────────────────────────────────────────────────────
    private void sendInviteEmailsToStudents(String mentorId, CreateSlotRequest request) {
        try {
            // 获取导师姓名（用于邮件正文）
            String mentorName = fetchUserRealName(mentorId);

            // 取导师负责的所有小组，再取每个小组内的所有学生
            List<String> groupKeys = mcpGroupService.listGroupKeysByMentor(mentorId);
            if (groupKeys.isEmpty()) return;

            String subject = "[BNBU MCS] New Appointment Slots Available – Please Book";
            String dateStr = request.getSlotDate() != null ? request.getSlotDate().toString() : "TBD";

            for (String groupKey : groupKeys) {
                List<String> studentIds = mcpGroupService.listStudentIdsFromOrg(groupKey);
                for (String studentId : studentIds) {
                    String studentEmail = fetchUserEmail(studentId);
                    if (studentEmail == null || studentEmail.isBlank()) continue;

                    String body = "Dear Student,\n\n"
                            + "Your mentor " + mentorName + " has published new appointment slots on " + dateStr + ".\n"
                            + "Available time slots:\n"
                            + formatSlotTimes(request.getStartTimes())
                            + "\nPlease log in to the MCS system to select and confirm your preferred slot as soon as possible.\n\n"
                            + "Best regards,\nBNBU MCS System";

                    sendEmail(studentEmail, subject, body);
                }
            }
        } catch (Exception e) {
            // 邮件发送失败不影响主业务流程
            log.warn("Failed to send invite emails for mentor {}: {}", mentorId, e.getMessage());
        }
    }

    // ────────────────────────────────────────────────────────────────────────
    // 邮件通知：学生完成预约 → 向 Mentor 和学生各发一封确认邮件
    // ────────────────────────────────────────────────────────────────────────
    private void sendConfirmationEmails(AppointmentSlot slot) {
        try {
            String mentorEmail   = fetchUserEmail(slot.getMentorId());
            String mentorName    = fetchUserRealName(slot.getMentorId());
            String studentEmail  = fetchUserEmail(slot.getStudentId());
            String studentName   = fetchUserRealName(slot.getStudentId());

            String dateStr  = slot.getSlotDate() != null ? slot.getSlotDate().toString() : "TBD";
            String timeStr  = slot.getStartTime() + " – " + slot.getEndTime();
            String venueStr = (slot.getVenue() != null && !slot.getVenue().isBlank())
                    ? slot.getVenue() : "TBD (will be notified by your mentor)";

            // ── 发给学生 ──
            if (studentEmail != null && !studentEmail.isBlank()) {
                String subjectStu = "[BNBU MCS] Appointment Confirmed";
                String bodyStu = "Dear " + studentName + ",\n\n"
                        + "Your mentoring appointment has been confirmed. Details below:\n\n"
                        + "  Date  : " + dateStr  + "\n"
                        + "  Time  : " + timeStr  + "\n"
                        + "  Venue : " + venueStr + "\n"
                        + "  Mentor: " + mentorName + "\n\n"
                        + "Please arrive on time. If you need to cancel, log in to the MCS system and cancel the appointment in advance.\n\n"
                        + "Best regards,\nBNBU MCS System";
                sendEmail(studentEmail, subjectStu, bodyStu);
            }

            // ── 发给 Mentor ──
            if (mentorEmail != null && !mentorEmail.isBlank()) {
                String subjectMen = "[BNBU MCS] A Student Has Booked Your Appointment Slot";
                String bodyMen = "Dear " + mentorName + ",\n\n"
                        + "A student has booked one of your appointment slots. Details below:\n\n"
                        + "  Date   : " + dateStr   + "\n"
                        + "  Time   : " + timeStr   + "\n"
                        + "  Venue  : " + venueStr  + "\n"
                        + "  Student: " + studentName + "\n\n"
                        + "If you need to update the venue, please do so via the MCS system.\n\n"
                        + "Best regards,\nBNBU MCS System";
                sendEmail(mentorEmail, subjectMen, bodyMen);
            }
        } catch (Exception e) {
            log.warn("Failed to send confirmation emails for slot {}: {}", slot.getSlotId(), e.getMessage());
        }
    }

    // ────────────────────────────────────────────────────────────────────────
    // 辅助方法
    // ────────────────────────────────────────────────────────────────────────

    /** 通过 Feign 从 User-Service 获取用户邮箱 */
    @SuppressWarnings("unchecked")
    private String fetchUserEmail(String userId) {
        try {
            Result res = userServiceClient.getUserById(userId);
            if (res != null && res.getCode() == 200 && res.getData() instanceof Map) {
                Map<String, Object> user = (Map<String, Object>) res.getData();
                Object email = user.get("email");
                return email != null ? email.toString() : null;
            }
        } catch (Exception e) {
            log.warn("Failed to fetch email for user {}: {}", userId, e.getMessage());
        }
        return null;
    }

    /** 通过 Feign 从 User-Service 获取用户真实姓名 */
    @SuppressWarnings("unchecked")
    private String fetchUserRealName(String userId) {
        try {
            Result res = userServiceClient.getUserById(userId);
            if (res != null && res.getCode() == 200 && res.getData() instanceof Map) {
                Map<String, Object> user = (Map<String, Object>) res.getData();
                Object name = user.get("realName");
                if (name != null && !name.toString().isBlank()) return name.toString();
                Object username = user.get("username");
                return username != null ? username.toString() : userId;
            }
        } catch (Exception e) {
            log.warn("Failed to fetch realName for user {}: {}", userId, e.getMessage());
        }
        return userId;
    }

    /** 通过 Feign 调 User-Service 的邮件接口发送邮件 */
    private void sendEmail(String to, String subject, String body) {
        NotifyEmailRequest req = new NotifyEmailRequest();
        req.setTo(to);
        req.setSubject(subject);
        req.setBody(body);
        userServiceClient.notifyEmail(req);
    }

    /** 格式化时间段列表为可读字符串 */
    private String formatSlotTimes(List<String> startTimes) {
        if (startTimes == null || startTimes.isEmpty()) return "  (no slots)\n";
        StringBuilder sb = new StringBuilder();
        for (String start : startTimes) {
            String end = addMinutes(start, 30);
            sb.append("  ").append(start).append(" – ").append(end).append("\n");
        }
        return sb.toString();
    }

    private String addMinutes(String hhmm, int minutes) {
        String[] parts = hhmm.split(":");
        int h = Integer.parseInt(parts[0]);
        int m = Integer.parseInt(parts[1]) + minutes;
        h += m / 60;
        m = m % 60;
        return String.format("%02d:%02d", h, m);
    }
}
