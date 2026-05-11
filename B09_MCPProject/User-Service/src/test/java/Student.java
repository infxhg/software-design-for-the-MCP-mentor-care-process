public class Student {
    String name;
    String userid;
    String email;
    String password;
    String role;
    String account;
    StudentStatus status;

    public Student() {
    }

    public Student(String name, String userid, String email, String password, String role, String account, StudentStatus status) {
        this.name = name;
        this.userid = userid;
        this.email = email;
        this.password = password;
        this.role = role;
        this.account = account;
        this.status = status;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getUserid() {
        return userid;
    }

    public void setUserid(String userid) {
        this.userid = userid;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getAccount() {
        return account;
    }

    public void setAccount(String account) {
        this.account = account;
    }

    public StudentStatus getStatus() {
        return status;
    }

    public void setStatus(StudentStatus status) {
        this.status = status;
    }

    @Override
    public String toString() {
        return "Student{" +
                "name='" + name + '\'' +
                ", userid='" + userid + '\'' +
                ", email='" + email + '\'' +
                ", password='" + password + '\'' +
                ", role='" + role + '\'' +
                ", account='" + account + '\'' +
                ", status=" + status +
                '}';
    }
}
