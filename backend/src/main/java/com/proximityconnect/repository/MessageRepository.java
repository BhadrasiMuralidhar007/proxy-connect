package com.proximityconnect.repository;

import com.proximityconnect.model.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface MessageRepository extends JpaRepository<Message, Long> {

    @Query("""
        SELECT m FROM Message m
        WHERE (m.senderId = :userA AND m.recipientId = :userB)
           OR (m.senderId = :userB AND m.recipientId = :userA)
        ORDER BY m.sentAt ASC
        """)
    List<Message> findConversation(@Param("userA") Long userA, @Param("userB") Long userB);
}
