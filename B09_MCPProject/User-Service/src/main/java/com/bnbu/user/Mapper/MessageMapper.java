package com.bnbu.user.Mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.bnbu.user.Entity.Message;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

public interface MessageMapper extends BaseMapper<Message> {

    @Select("SELECT m.id, m.sender_id, m.content, m.create_time, r.is_read " +
            "FROM message_recipient r " +
            "LEFT JOIN message m ON r.message_id = m.id " +
            "WHERE r.receiver_id = #{userId} " +
            "ORDER BY m.create_time DESC")
    List<Message> selectUserMessages(@Param("userId") String userId);

}
