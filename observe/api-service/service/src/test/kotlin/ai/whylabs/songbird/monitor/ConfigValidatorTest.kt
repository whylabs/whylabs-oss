package ai.whylabs.songbird.monitor

import ai.whylabs.songbird.dataservice.DataService
import ai.whylabs.songbird.v0.dao.NotificationActionDAO
import io.micrometer.core.instrument.MeterRegistry
import io.mockk.impl.annotations.RelaxedMockK
import io.mockk.junit5.MockKExtension
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.TestInstance
import org.junit.jupiter.api.extension.ExtendWith
import java.nio.charset.StandardCharsets

@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@ExtendWith(MockKExtension::class)
internal class ConfigValidatorTest {

    @RelaxedMockK
    private lateinit var dataService: DataService

    @RelaxedMockK
    private lateinit var notificationActionDAO: NotificationActionDAO

    @RelaxedMockK
    private lateinit var meterRegistry: MeterRegistry

    @Test
    fun `should validate example monitor config schema successfully`() {
        val monitorConfig = String(javaClass.getResourceAsStream("/monitor-config-example.json")!!.readBytes(), StandardCharsets.UTF_8)
        val validator = ConfigValidator(SchemaResolver(LocalSchemaProvider()), dataService, notificationActionDAO, meterRegistry)
        validator.validateConfig(monitorConfig, "org-1", "model-1")
    }
}
