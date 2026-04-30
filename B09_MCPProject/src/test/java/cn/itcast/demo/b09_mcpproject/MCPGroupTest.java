package cn.itcast.demo.b09_mcpproject;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class MCPGroupTest {

    private MCPGroup mcpGroup;

    @BeforeEach
    void setUp() {
        mcpGroup = new MCPGroup();
        mcpGroup.GroupId = "G001";
    }


    @Nested
    @DisplayName("valid testing - removestudent ")
    class EquivalenceClassTests {

        @Test
        @DisplayName("valid：deleting valid stu")
        void testRemoveExistingStudent() {
            mcpGroup.addStudent(new Student("Alice", "S001", null, null, null, null, null));
            boolean result = mcpGroup.removestudent("S001");
            assertThat(result).isTrue();
            assertThat(mcpGroup.getStudent()).isEmpty();
        }

        @ParameterizedTest
        @ValueSource(strings = {"NON_EXISTENT", "", " "})
        @DisplayName("invalid：trying to delete incorrect id ")
        void testRemoveInvalidStudent(String invalidId) {
            mcpGroup.addStudent(new Student("Alice", "S001", null, null, null, null, null));
            boolean result = mcpGroup.removestudent(invalidId);
            assertThat(result).isFalse();
            assertThat(mcpGroup.getStudent()).hasSize(1);
        }
    }


    @Nested
    @DisplayName("boundary case")
    class BoundaryValueTests {

        @Test
        @DisplayName("boundary：empty list delete operation")
        void testRemoveFromEmptyList() {
            boolean result = mcpGroup.removestudent("ANY_ID");
            assertThat(result).isFalse();
        }

        @Test
        @DisplayName("Boundary：only one studnet in the list and delete it")
        void testRemoveOnlyStudent() {
            mcpGroup.addStudent(new Student("Bob", "S002", null, null, null, null, null));
            mcpGroup.removestudent("S002");
            assertThat(mcpGroup.getStudent()).isEmpty();
        }
    }


    @Nested
    @DisplayName("white box coverage")
    class WhiteBoxTests {

        @Test
        @DisplayName("brunch coverage：removestudent ")
        void testBranchCoverage() {
            mcpGroup.addStudent(new Student("User1", "ID1", null, null, null, null, null));


            mcpGroup.removestudent("WRONG_ID");


            mcpGroup.removestudent("ID1");

            assertThat(mcpGroup.getStudent()).isEmpty();
        }
    }
}
