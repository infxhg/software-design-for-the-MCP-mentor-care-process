package com.bnbu.organizational.DTO;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateOrgUnitRequest {

    @NotBlank(message = "name is required")
    private String name;

    /** FACULTY | DEPARTMENT | MAJOR */
    @NotBlank(message = "type is required")
    private String type;

    /** 学院 parentId 可为空；系/专业必填 */
    private String parentId;

    private Integer sortOrder;
}
