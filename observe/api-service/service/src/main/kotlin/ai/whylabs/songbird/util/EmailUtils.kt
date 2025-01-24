package ai.whylabs.songbird.util

import ai.whylabs.songbird.operations.ArgumentValueException
import org.apache.commons.validator.routines.EmailValidator

object EmailUtils {

    fun isValid(email: String?): Boolean {
        if (email == null) {
            return true
        }
        return EmailValidator.getInstance(false).isValid(email)
    }

    fun requireValid(email: String?) {
        if (!isValid(email)) {
            throw ArgumentValueException("Invalid email address format: $email. Only a single email is allowed.", "email")
        }
    }
}
