import { test, expect } from '@playwright/test';

test('예정 추가는 로그 제외, 학생 수정과 삭제 후에도 당시 좌석과 이름 보존', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    const studentModule = '/src/lib/students.ts';
    const journalModule = '/src/lib/counseling-journals.ts';
    const planModule = '/src/lib/counseling-plans.ts';
    const { saveStudent, deleteStudent } = await import(studentModule);
    const { createJournal, deleteJournal } = await import(journalModule);
    const { createPlan } = await import(planModule);
    const student = { id: 'snapshot-student', name: '기존이름', building: 1, seat_number: 'W01', gender: null, student_status: null, phone: null, counseling_cycle_weeks: 1 };
    const date = new Date().toLocaleDateString('en-CA');
    await saveStudent(student, false, '담당선생님');
    await createPlan({ student_id: student.id, date, time: '00:00', note: '' });
    await saveStudent({ ...student, seat_number: 'W02', name: '변경이름' }, true, '담당선생님');
    const journal = await createJournal({ student_id: student.id, date, content: '비공개 내용', special_notes: '' }, '담당선생님');
    await deleteJournal(journal.id, '담당선생님');
    await deleteStudent(student.id, '담당선생님');
    const logs = JSON.parse(localStorage.getItem('holoseogi-activity-logs') ?? '[]');
    if (logs.some((row: { action: string }) => row.action === '상담할 학생 추가')) throw Error('예정 추가 로그가 생성됨');
    // Previously stored plan additions must also be excluded from the listing.
    localStorage.setItem('holoseogi-activity-logs', JSON.stringify([...logs, { ...logs[0], id: 'legacy-plan', action: '상담할 학생 추가' }]));
  });
  await page.getByRole('button', { name: '활동 로그', exact: true }).click();
  await expect(page.locator('tbody tr')).toHaveCount(5);
  const added = page.locator('tbody tr').filter({ has: page.getByRole('cell', { name: '학생 추가', exact: true }) });
  await expect(added).toContainText('W01');
  await expect(added).toContainText('기존이름');
  for (const action of ['학생 수정', '학생 삭제', '상담 완료', '상담 삭제']) {
    const row = page.locator('tbody tr').filter({ has: page.getByRole('cell', { name: action, exact: true }) });
    await expect(row).toContainText('W02');
    await expect(row).toContainText('변경이름');
  }
  await expect(page.locator('tbody')).not.toContainText('비공개 내용');
});
