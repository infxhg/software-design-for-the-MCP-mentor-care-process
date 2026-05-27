package com.bnbu.mentoring.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * 导出文件下载结果：单 docx 或按专业拆分的 zip。
 */
@Data
@AllArgsConstructor
public class ExportDownloadResult {
    private byte[] data;
    private String filename;
    private String contentType;

    public static ExportDownloadResult docx(byte[] data, String filename) {
        return new ExportDownloadResult(data, filename,
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    }

    public static ExportDownloadResult zip(byte[] data, String filename) {
        return new ExportDownloadResult(data, filename, "application/zip");
    }
}
