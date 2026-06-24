export type DateRelation = 'past' | 'today' | 'future';

export function getLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDateRelation(dateKey: string, todayKey = getLocalDateKey()): DateRelation {
  if (dateKey === todayKey) return 'today';
  return dateKey < todayKey ? 'past' : 'future';
}

export function getDateStateVerb(dateKey: string): 'was' | 'is' | 'will be' {
  const relation = getDateRelation(dateKey);
  if (relation === 'today') return 'is';
  return relation === 'past' ? 'was' : 'will be';
}

export function getKnownShiftQuestion(dateKey: string): string {
  const relation = getDateRelation(dateKey);
  if (relation === 'today') return 'What shift are you on today?';
  if (relation === 'future') return 'What shift will you be on that date?';
  return 'What shift were you on that date?';
}

export function getKnownShiftSupport(dateKey: string, displayDate: string): string {
  const relation = getDateRelation(dateKey);
  if (relation === 'today') return `Choose the shift you are on today, ${displayDate}.`;
  if (relation === 'future') return `Choose the shift you will have on ${displayDate}.`;
  return `Choose the shift you had on ${displayDate}.`;
}

export function getKnownOffChoiceBody(dateKey: string): string {
  const relation = getDateRelation(dateKey);
  if (relation === 'today') return 'I am not working';
  if (relation === 'future') return 'I will not be working';
  return 'I was not working';
}

export function getKnownWorkChoiceBody(dateKey: string, shiftName: 'day' | 'night'): string {
  const relation = getDateRelation(dateKey);
  if (relation === 'today') return `I am working a ${shiftName} shift`;
  if (relation === 'future') return `I will work a ${shiftName} shift`;
  return `I worked a ${shiftName} shift`;
}

export function getExactPhaseQuestion(dateKey: string): string {
  const relation = getDateRelation(dateKey);
  if (relation === 'today') return 'Which one is it?';
  if (relation === 'future') return 'Which one will it be?';
  return 'Which one was it?';
}

export function getExactPhaseUnsureHint(dateKey: string): string {
  const relation = getDateRelation(dateKey);
  if (relation === 'today') return 'Use the fix options if you do not know which one it is.';
  if (relation === 'future') return 'Use the fix options if you do not know which one it will be.';
  return 'Use the fix options if you do not know which one it was.';
}

export function getKnownDateShiftCorrectionBody(dateKey: string): string {
  const relation = getDateRelation(dateKey);
  if (relation === 'today') return 'Change whether today is day, night, off, or something else.';
  if (relation === 'future') {
    return 'Change whether that date will be day, night, off, or something else.';
  }
  return 'Change whether that date was day, night, off, or something else.';
}

export function getKnownDatePreviewSentence(
  dateKey: string,
  displayDate: string,
  shiftLabel: string
): string {
  const relation = getDateRelation(dateKey);
  if (relation === 'today') return `Today, ${displayDate}, you are on ${shiftLabel}.`;
  if (relation === 'future') return `On ${displayDate}, you will be on ${shiftLabel}.`;
  return `On ${displayDate}, you were on ${shiftLabel}.`;
}
