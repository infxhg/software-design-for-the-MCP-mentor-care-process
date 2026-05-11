import java.util.ArrayList;
import java.util.List;

public class MCPGroup {
    String GroupId;
    ArrayList<Student> students =new ArrayList<>();

    public boolean addStudent(Student stu){
        return students.add(stu);
    }

    public boolean removestudent(String sid){
        return  students.removeIf(student -> student.userid .equals(sid) );
    }

    public List getStudent(){
        return students;
    }
}
