package ai.whylabs.songbird.secure.policy

enum class PolicySource(val value: String) {
    UI("ui"),
    API("api");

    companion object {
        fun fromString(value: String?): PolicySource? {
            return values().find { it.value == value }
        }
    }
}
