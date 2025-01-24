package ai.whylabs.songbird.secure.policy

enum class PolicySchemaVersion(val value: String, val version: Int) {
    V0_0_1("0.0.1", 1),
    V0_1_0("0.1.0", 2);

    companion object {
        fun fromString(value: String?): PolicySchemaVersion? {
            if (value == null) {
                // Default to the original version if not supplied
                return V0_0_1
            }
            return values().find { it.value == value }
        }
    }
}
