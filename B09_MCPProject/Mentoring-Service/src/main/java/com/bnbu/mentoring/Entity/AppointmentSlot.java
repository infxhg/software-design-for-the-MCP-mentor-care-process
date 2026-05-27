package com.bnbu.mentoring.Entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@TableName("mcp_appointment_slot")
public class AppointmentSlot {
    @TableId(type = IdType.ASSIGN_UUID)
    private String slotId;
    private String mentorId;
    private String studentId;
    private LocalDate slotDate;
    private String startTime;
    private String endTime;
    private String venue;
    private String status;
    private LocalDateTime createTime;
}
