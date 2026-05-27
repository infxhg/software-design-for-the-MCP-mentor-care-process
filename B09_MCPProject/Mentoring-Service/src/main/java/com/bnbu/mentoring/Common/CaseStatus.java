package com.bnbu.mentoring.Common;

/**
 * MCP 案例状态机（SRS 3.11）
 */
public final class CaseStatus {
    public static final String AT_COORDINATOR = "AT_COORDINATOR";
    public static final String AT_CONSULTANT = "AT_CONSULTANT";
    public static final String CLOSED = "CLOSED";
    public static final String REJECTED = "REJECTED";

    private CaseStatus() {
    }
}
