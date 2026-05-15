package com.bnbu.organizational.Mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.bnbu.organizational.Entity.SysMentorInfo;
import org.apache.ibatis.annotations.Mapper;

/**
 * 导师信息 Mapper 接口
 * 继承 BaseMapper 即可使用 selectBatchIds 等内置方法
 */
@Mapper
public interface SysMentorInfoMapper extends BaseMapper<SysMentorInfo> {
}
