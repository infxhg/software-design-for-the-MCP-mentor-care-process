package com.bnbu.user.Service;

import com.bnbu.user.client.MentoringInternalAccessClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * 调用 Mentoring-Service 内部接口，裁剪 FC 可见学生范围。
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class MentoringStudentScopeClient {

    private final MentoringInternalAccessClient mentoringInternalAccessClient;

    public List<String> filterStudentIdsForFacultyConsultant(String consultantId, List<String> studentIds) {
        if (studentIds == null || studentIds.isEmpty()) {
            return List.of();
        }
        try {
            Map<String, Object> res = mentoringInternalAccessClient.filterStudentIdsForFacultyConsultant(
                    consultantId, studentIds);
            if (res == null) {
                return List.of();
            }
            Object codeObj = res.get("code");
            int code = codeObj instanceof Number n ? n.intValue() : 0;
            if (code != 200) {
                log.warn("mentoring filter-student-ids non-200: code={}, msg={}", code, res.get("message"));
                return List.of();
            }
            Object data = res.get("data");
            if (data instanceof List<?> list) {
                List<String> out = new ArrayList<>();
                for (Object o : list) {
                    if (o != null) {
                        out.add(String.valueOf(o));
                    }
                }
                return out;
            }
        } catch (Exception e) {
            log.warn("mentoring filter-student-ids failed: {}", e.getMessage());
        }
        return List.of();
    }
}
