package ai.whylabs.songbird.v0.dao

import ai.whylabs.songbird.logging.SongbirdLogger
import ai.whylabs.songbird.v0.ddb.BaseKey
import ai.whylabs.songbird.v0.ddb.DynamoDBItem
import ai.whylabs.songbird.v0.ddb.ItemId
import ai.whylabs.songbird.v0.ddb.KeyCreator
import ai.whylabs.songbird.v0.ddb.PlaceHolder
import ai.whylabs.songbird.v0.ddb.UserPrefix
import com.amazonaws.services.dynamodbv2.datamodeling.DynamoDBMapper
import io.mockk.mockk
import org.junit.jupiter.api.Assertions
import org.junit.jupiter.api.Test

class DynamoCRUDTest {

    private val testCrud = TestCRUD()

    @Test
    fun `ids are generated if none are supplied`() {
        val id = testCrud.create(TestItemWithId())
        Assertions.assertEquals(generatedId, id.id)
    }

    @Test
    fun `ids are not generated if one is supplied`() {
        val overrideId = "myid"
        val id = testCrud.create(TestItemWithId(id = overrideId))
        Assertions.assertEquals(overrideId, id.id)
    }
}

private val testKeyCreator = KeyCreator(UserPrefix) { (userId) -> TestKey(userId) }

private data class TestKey(val id: String) : BaseKey by testKeyCreator.baseKey(id)

private data class TestItemWithId(val id: String = PlaceHolder, val key: TestKey = TestKey(id)) : DynamoDBItem<TestItemWithId, ItemId.String> {
    override fun getPrimaryKey() = key
    override fun setId(id: String) = this.copy(id = id)
    override fun getId() = ItemId.String(id)
}

private data class TestItemWithIdModel(val id: String)

val generatedId = "test-123"

private class TestCRUD : DynamoCRUD<TestItemWithId, TestItemWithIdModel, ItemId.String> {
    override fun getMapper() = mockk<DynamoDBMapper>(relaxed = true)
    override fun getLogger() = mockk<SongbirdLogger>(relaxed = true)
    override fun getCls() = TestItemWithId::class.java
    override fun createId(item: TestItemWithId) = ItemId.String(generatedId)
    override fun toItem(apiModel: TestItemWithIdModel) = TestItemWithId(id = apiModel.id)
    override fun toApiModel(item: TestItemWithId) = TestItemWithIdModel(id = item.id)
    override fun getListIndex() = null
}
