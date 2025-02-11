import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Remove the old ReactDOM.render call
const root = createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

class Student {
    constructor(name, student_id) {
        this.name = name;
        this.student_id = student_id;
        this.grades = [];
    }

    add_grade(grade) {
        if (0 <= grade && grade <= 100) {
            this.grades.push(grade);
        } else {
            throw new Error("Grade must be between 0 and 100");
        }
    }

    get_average() {
        return this.grades.length ? this.grades.reduce((a, b) => a + b, 0) / this.grades.length : 0;
    }
}

class GradeBook {
    constructor() {
        this.students = {};
    }

    add_student(name, student_id) {
        if (!this.students[student_id]) {
            this.students[student_id] = new Student(name, student_id);
        } else {
            throw new Error("Student ID already exists");
        }
    }

    remove_student(student_id) {
        if (this.students[student_id]) {
            delete this.students[student_id];
        } else {
            throw new Error("Student ID not found");
        }
    }

    find_student(student_id) {
        if (this.students[student_id]) {
            return this.students[student_id];
        }
        throw new Error("Student ID not found");
    }

    class_average() {
        if (!Object.keys(this.students).length) {
            return 0;
        }
        const total = Object.values(this.students).reduce((sum, student) => sum + student.get_average(), 0);
        return total / Object.keys(this.students).length;
    }

    generate_report() {
        let report = "Grade Report\n============\n";
        const sortedStudents = Object.values(this.students).sort((a, b) => a.name.localeCompare(b.name));
        sortedStudents.forEach(student => {
            report += `Name: ${student.name}\n`;
            report += `ID: ${student.student_id}\n`;
            report += `Average: ${student.get_average().toFixed(2)}\n`;
            report += "------------\n";
        });
        return report;
    }
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
