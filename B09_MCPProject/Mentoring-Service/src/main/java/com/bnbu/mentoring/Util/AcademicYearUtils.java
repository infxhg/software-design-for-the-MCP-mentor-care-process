package com.bnbu.mentoring.Util;

import java.time.LocalDate;

/**
 * 学年（Academic year）按 9 月 1 日划分：例如 2024-09-01 ~ 2025-08-31 为 Academic year 2024-2025。
 */
public final class AcademicYearUtils {

    private AcademicYearUtils() {
    }

    /** 访谈日期所属学年的起始年份，如 2025-03-15 → 2024（即 2024-2025 学年） */
    public static int startYearOf(LocalDate date) {
        if (date == null) {
            return 0;
        }
        return date.getMonthValue() >= 9 ? date.getYear() : date.getYear() - 1;
    }

    public static String label(LocalDate date) {
        int start = startYearOf(date);
        if (start == 0) {
            return "";
        }
        return start + "-" + (start + 1);
    }

    public static LocalDate rangeStart(int academicYearStart) {
        return LocalDate.of(academicYearStart, 9, 1);
    }

    public static LocalDate rangeEnd(int academicYearStart) {
        return LocalDate.of(academicYearStart + 1, 8, 31);
    }

    public static boolean inAcademicYearRange(LocalDate date, Integer fromStartYear, Integer toStartYear) {
        if (date == null) {
            return false;
        }
        int y = startYearOf(date);
        if (fromStartYear != null && y < fromStartYear) {
            return false;
        }
        if (toStartYear != null && y > toStartYear) {
            return false;
        }
        return true;
    }
}
