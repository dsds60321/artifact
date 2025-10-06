package com.gunho.artifact.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class RedisService {

    private final RedisTemplate<String, Object> redisTemplate;
    private final ObjectMapper objectMapper;

    public void set(String key, Object value) {
        ValueOperations<String, Object> valueOperations = redisTemplate.opsForValue();
        valueOperations.set(key, value);
    }

    public void set(String key, Object value, Duration ttl) {
        ValueOperations<String, Object> valueOperations = redisTemplate.opsForValue();
        valueOperations.set(key, value, ttl);
    }

    public <T> Optional<T> get(String key, Class<T> type) {
        ValueOperations<String, Object> valueOperations = redisTemplate.opsForValue();
        Object stored = valueOperations.get(key);
        return Optional.ofNullable(convertValue(stored, type));
    }

    public <T> T getOrDefault(String key, Class<T> type, T defaultValue) {
        return get(key, type).orElse(defaultValue);
    }

    public boolean hasKey(String key) {
        Boolean hasKey = redisTemplate.hasKey(key);
        return Boolean.TRUE.equals(hasKey);
    }

    public void delete(String key) {
        redisTemplate.delete(key);
    }

    public boolean expire(String key, Duration ttl) {
        Boolean result = redisTemplate.expire(key, ttl);
        return Boolean.TRUE.equals(result);
    }

    public Long getExpire(String key) {
        return redisTemplate.getExpire(key);
    }

    public long increment(String key) {
        ValueOperations<String, Object> valueOperations = redisTemplate.opsForValue();
        Long result = valueOperations.increment(key);
        return result != null ? result : 0L;
    }

    public long increment(String key, long delta) {
        ValueOperations<String, Object> valueOperations = redisTemplate.opsForValue();
        Long result = valueOperations.increment(key, delta);
        return result != null ? result : 0L;
    }

    private <T> T convertValue(Object value, Class<T> type) {
        if (value == null) {
            return null;
        }

        if (type.isInstance(value)) {
            return type.cast(value);
        }

        return objectMapper.convertValue(value, type);
    }
}
