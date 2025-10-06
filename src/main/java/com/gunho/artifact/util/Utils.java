package com.gunho.artifact.util;

import java.lang.reflect.Array;
import java.security.SecureRandom;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;

public class Utils {

    public static boolean isEmpty(Object obj) {
        if (obj == null) {
            return true;
        } else if (obj instanceof String) {
            return ((String) obj).isEmpty();
        } else if (obj instanceof Optional) {
            return ((Optional<?>)obj).isEmpty();
        } else if (obj instanceof CharSequence) {
            return ((CharSequence) obj).isEmpty();
        } else if (obj.getClass().isArray()) {
            return Array.getLength(obj) == 0;
        } else if (obj instanceof Collection) {
            return ((Collection<?>)obj).isEmpty();
        } else {
            return obj instanceof Map && ((Map<?, ?>) obj).isEmpty();
        }
    }

    public static boolean isNotEmpty(Object obj) {
        return !isEmpty(obj);
    }


    public static <T> T ifNullDefaultValue(Object obj, T defaultValue) {
        return Utils.isEmpty(obj) ? defaultValue : (T) obj ;
    }

    public static String generateRandomCode(int length) {
        int min = (int) Math.pow(10, length - 1);
        int max = (int) Math.pow(10, length) - 1;
        int code = new SecureRandom().nextInt(max - min + 1) + min;

        return String.valueOf(code);
    }

    public static class MsgUtil {

        /**
         * {} 형태 replace
         */
        public static String getMessage(String originMsg, List<String> replace) {
            if (originMsg == null || replace == null) {
                return originMsg;
            }

            String result = originMsg;
            int replaceIndex = 0;

            while (result.contains("{}") && replaceIndex < replace.size()) {
                String replacement = replace.get(replaceIndex) != null ? replace.get(replaceIndex) : "";
                result = result.replaceFirst("\\{\\}", replacement);
                replaceIndex++;
            }

            return result;
        }

    }

}
