package com.bnbu.mentoring.Common;

import org.springframework.util.StringUtils;

import java.util.Locale;
import java.util.Set;

/**
 * mcp_student_ext.status 合法取值（小写，与 SRS 一致）。
 */
public final class StudentMentoringStatus {

    public static final String NORMAL = "normal";
    public static final String SUSPENDED = "suspended";
    public static final String PROBATION = "probation";

    public static final Set<String> ALLOWED = Set.of(NORMAL, SUSPENDED, PROBATION);

    private StudentMentoringStatus() {
    }

    /** 插入/导入时：空值默认 normal。 */
    public static String resolveForInsert(String raw) {
        if (!StringUtils.hasText(raw)) {
            return NORMAL;
        }
        return normalizeOrThrow(raw);
    }

    /** 非空时必须为三者之一（兼容历史大小写与 ACTIVE）。 */
    public static String normalizeOrThrow(String raw) {
        if (!StringUtils.hasText(raw)) {
            throw new IllegalArgumentException("Student mentoring status is required");
        }
        String key = raw.trim().toLowerCase(Locale.ROOT);
        return switch (key) {
            case NORMAL, "active" -> NORMAL;
            case SUSPENDED -> SUSPENDED;
            case PROBATION -> PROBATION;
            default -> throw new IllegalArgumentException(
                    "Invalid student mentoring status: \"" + raw.trim()
                            + "\". Allowed: normal, suspended, probation");
        };
    }

    public static boolean isAllowed(String status) {
        return status != null && ALLOWED.contains(status);
    }
}
