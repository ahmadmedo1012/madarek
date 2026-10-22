/**
 * r307 test fixtures — one video shape matching the registry contract
 * (university-media.ts). Tests never invent network data; the fixture
 * mirrors the real manifest row for misurata-exams.
 */
import type { UniversityVideo } from '../../../src/data/university-media';

export const universityVideosFixture: UniversityVideo = {
  id: 'misurata-exams',
  institution: 'جامعة مصراتة',
  titleAr: 'أجواء امتحانات نهاية الفصل بكليات جامعة مصراتة',
  kindAr: 'فيديو توثيقي من القناة الرسمية للجامعة',
  durationAr: '5:11',
  videoId: 'qM67yDknM0U',
  channelAr: 'القناة الرسمية لجامعة مصراتة',
};
