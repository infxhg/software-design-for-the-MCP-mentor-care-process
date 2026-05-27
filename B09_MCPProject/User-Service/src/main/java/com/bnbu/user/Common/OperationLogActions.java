package com.bnbu.user.Common;

/**
 * sys_operation_log.action 约定（全系统统一命名，便于 Supporting Staff / FC 检索）。
 */
public final class OperationLogActions {

    private OperationLogActions() {
    }

    public static final String LOGIN = "LOGIN";
    public static final String LOGOUT = "LOGOUT";
    public static final String VIEW_ALL_STUDENTS = "VIEW_ALL_STUDENTS";
    public static final String SEARCH_STUDENTS = "SEARCH_STUDENTS";

    public static final String SEND_MESSAGE = "SEND_MESSAGE";
    public static final String SEND_INTERNAL_MESSAGE = "SEND_INTERNAL_MESSAGE";
    public static final String VIEW_MESSAGE_LIST = "VIEW_MESSAGE_LIST";
    public static final String VIEW_MESSAGE_DETAIL = "VIEW_MESSAGE_DETAIL";

    public static final String VIEW_GROUP_STATUS = "VIEW_GROUP_STATUS";
    public static final String VIEW_MY_MENTOR = "VIEW_MY_MENTOR";
    public static final String VIEW_MY_INTERVIEW_RECORDS = "VIEW_MY_INTERVIEW_RECORDS";
    public static final String VIEW_INTERVIEW_RECORD = "VIEW_INTERVIEW_RECORD";

    public static final String CREATE_INTERVIEW_RECORD = "CREATE_INTERVIEW_RECORD";
    public static final String DELETE_INTERVIEW_RECORD = "DELETE_INTERVIEW_RECORD";
    public static final String VIEW_MENTOR_INTERVIEW_RECORDS = "VIEW_MENTOR_INTERVIEW_RECORDS";
    public static final String VIEW_STUDENT_INTERVIEW_RECORDS = "VIEW_STUDENT_INTERVIEW_RECORDS";
    public static final String VIEW_GROUP_INTERVIEW_RECORDS = "VIEW_GROUP_INTERVIEW_RECORDS";
    public static final String SEARCH_STUDENT_IN_GROUPS = "SEARCH_STUDENT_IN_GROUPS";

    public static final String VIEW_MENTOR_APPOINTMENT_SLOTS = "VIEW_MENTOR_APPOINTMENT_SLOTS";
    public static final String CONFIRM_APPOINTMENT = "CONFIRM_APPOINTMENT";

    public static final String SEARCH_GROUP = "SEARCH_GROUP";
    public static final String VIEW_GROUP_MEMBERS = "VIEW_GROUP_MEMBERS";
    public static final String VIEW_ORG_STUDENT = "VIEW_ORG_STUDENT";
    public static final String SEARCH_SCOPE_USERS = "SEARCH_SCOPE_USERS";
}
