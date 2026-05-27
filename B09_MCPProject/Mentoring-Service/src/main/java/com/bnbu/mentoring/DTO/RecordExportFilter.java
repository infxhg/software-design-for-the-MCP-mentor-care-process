package com.bnbu.mentoring.DTO;

import lombok.Data;

import java.time.LocalDate;

/**
 * Faculty Consultant 导出访谈记录 Word 的筛选条件。
 */
@Data
public class RecordExportFilter {
    private String studentId;
    /** 学生 ID / 姓名 / 邮箱 模糊匹配 */
    private String studentKeyword;
    /** 导师姓名 / 用户名 模糊匹配 */
    private String mentorKeyword;
    /** 学年起始年（含），如 2024 表示 2024-2025 学年 */
    private Integer academicYearFrom;
    private Integer academicYearTo;
    private LocalDate dateFrom;
    private LocalDate dateTo;
    /** 匹配 sys_org_unit.name（type=FACULTY），与 department/major 子树取交集 */
    private String faculty;
    /** 匹配 sys_org_unit.name（type=DEPARTMENT），与该节点下属组织取交集 */
    private String department;
    /** 匹配 sys_org_unit MAJOR（name/id/短码如 CST），与该专业下 GROUP 取交集；仅导出有访谈记录的学生 */
    private String major;
}
