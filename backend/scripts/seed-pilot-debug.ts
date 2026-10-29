import { PrismaClient } from '@prisma/client';
async function main(): Promise<void> {
  const p = new PrismaClient();
  const insts = (await p.$queryRawUnsafe('SELECT slug, name FROM "Institution"')) as Array<{ slug: string; name: string }>;
  console.log('INSTITUTIONS=' + JSON.stringify(insts));
  const teacher = (await p.$queryRawUnsafe("SELECT id FROM \"User\" WHERE email='teacher@test.ly'")) as Array<{ id: string }>;
  console.log('TEACHER=' + (teacher.length ? 'YES ' + teacher[0].id : 'NO'));
  const facs = (await p.$queryRawUnsafe('SELECT id, name FROM "Faculty" LIMIT 5')) as Array<{ id: string; name: string }>;
  console.log('FACULTIES=' + JSON.stringify(facs));
  const depts = (await p.$queryRawUnsafe('SELECT id, name, "facultyId" FROM "Department" LIMIT 8')) as Array<{ id: string; name: string; facultyId: string }>;
  console.log('DEPARTMENTS=' + JSON.stringify(depts));
  const offerings = (await p.$queryRawUnsafe("SELECT count(*)::int AS n FROM \"CourseOffering\" WHERE term='2024-FALL'")) as Array<{ n: number }>;
  console.log('OFFERINGS_2024FALL=' + offerings[0].n);
  const terms = (await p.$queryRawUnsafe('SELECT DISTINCT term FROM "CourseOffering"')) as Array<{ term: string }>;
  console.log('TERMS=' + JSON.stringify(terms));
  await p.$disconnect();
}
void main();
