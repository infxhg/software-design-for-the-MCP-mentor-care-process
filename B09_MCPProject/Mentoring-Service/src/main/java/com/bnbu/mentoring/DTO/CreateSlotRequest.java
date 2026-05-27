package com.bnbu.mentoring.DTO;

import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
public class CreateSlotRequest {
    private LocalDate slotDate;
    private List<String> startTimes;
}
