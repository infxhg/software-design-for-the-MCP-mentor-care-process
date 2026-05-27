package com.bnbu.mentoring.Controller;

import com.bnbu.mentoring.DTO.ConfirmSlotRequest;
import com.bnbu.mentoring.DTO.CreateSlotRequest;
import com.bnbu.mentoring.DTO.Result;
import com.bnbu.mentoring.DTO.SetVenueRequest;
import com.bnbu.mentoring.Common.OperationLogActions;
import com.bnbu.mentoring.Service.AppointmentService;
import com.bnbu.mentoring.Service.OperationLogRecorder;
import com.bnbu.mentoring.Util.SecurityRoleUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/mentoring/appointments")
@RequiredArgsConstructor
public class AppointmentController {

    private final AppointmentService appointmentService;
    private final OperationLogRecorder operationLogRecorder;

    @PreAuthorize("hasAuthority('ROLE_MENTOR')")
    @PostMapping("/slots")
    public Result createSlots(@RequestHeader("X-User-Id") String mentorId,
                              @RequestBody CreateSlotRequest request) {
        if (request.getStartTimes() == null || request.getStartTimes().isEmpty()) {
            return Result.error("Warning: no available slot selected");
        }
        return Result.success("Slots created", appointmentService.createSlots(mentorId, request));
    }

  /**
     * 学生：查看本组导师可预约时段（仅 AVAILABLE）。
     * 导师：查看自己发布的全部时段（路径 mentorId 须与 X-User-Id 一致）。
     */
    @PreAuthorize("hasAnyAuthority('ROLE_STUDENT', 'ROLE_MENTOR')")
    @GetMapping("/slots/mentor/{mentorId}")
    public Result listSlotsByMentorPath(
            @RequestHeader("X-User-Id") String currentUserId,
            @PathVariable String mentorId) {
        try {
            String role = SecurityRoleUtils.primaryRoleCode();
            if ("MENTOR".equals(role)) {
                if (currentUserId == null || !currentUserId.equals(mentorId)) {
                    return Result.error("权限不足：只能查看自己的面谈时段");
                }
                return Result.success("success", appointmentService.listSlotsByMentor(mentorId));
            }
            var slots = appointmentService.listAvailableForStudent(currentUserId, mentorId);
            operationLogRecorder.recordQuiet(currentUserId, OperationLogActions.VIEW_MENTOR_APPOINTMENT_SLOTS,
                    "mentorId=" + mentorId);
            return Result.success("success", slots);
        } catch (RuntimeException e) {
            return Result.error(e.getMessage());
        }
    }

    @PreAuthorize("hasAuthority('ROLE_STUDENT')")
    @PostMapping("/confirm")
    public Result confirm(@RequestHeader("X-User-Id") String studentId,
                          @RequestBody ConfirmSlotRequest request) {
        if (request.getSlotId() == null || request.getSlotId().isBlank()) {
            return Result.error("Warning: please select a time slot");
        }
        var confirmed = appointmentService.confirmSlot(studentId, request.getSlotId());
        operationLogRecorder.recordQuiet(studentId, OperationLogActions.CONFIRM_APPOINTMENT,
                "slotId=" + request.getSlotId());
        return Result.success("Appointment confirmed", confirmed);
    }

    @PreAuthorize("hasAuthority('ROLE_MENTOR')")
    @PutMapping("/slots/{slotId}/venue")
    public Result setVenue(@RequestHeader("X-User-Id") String mentorId,
                           @PathVariable String slotId,
                           @RequestBody SetVenueRequest request) {
        return Result.success("Venue saved",
                appointmentService.setVenue(mentorId, slotId, request.getVenue()));
    }

    @PreAuthorize("hasAuthority('ROLE_MENTOR')")
    @DeleteMapping("/slots/{slotId}")
    public Result cancel(@RequestHeader("X-User-Id") String mentorId, @PathVariable String slotId) {
        appointmentService.cancelSlot(mentorId, slotId);
        return Result.success("Appointment cancelled", null);
    }
}
