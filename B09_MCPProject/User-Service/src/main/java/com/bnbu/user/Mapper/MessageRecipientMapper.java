package com.bnbu.user.Mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.bnbu.user.Entity.MessageRecipient;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

public interface MessageRecipientMapper extends BaseMapper<MessageRecipient> {

    @Select("SELECT receiver_id FROM message_recipient WHERE message_id = #{messageId}")
    List<String> selectReceiverIdsByMessageId(@Param("messageId") Long messageId);
}
