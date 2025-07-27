export class EventManager {
  constructor() {
    this.eventActive = false;
    this.eventStartTime = null;
    this.eventEndTime = null;
    this.eventDuration = 60000; // 1분 (60초)
  }

  startEvent() {
    const now = new Date();
    this.eventStartTime = now;
    this.eventEndTime = new Date(now.getTime() + this.eventDuration);
    this.eventActive = true;

    console.log(`이벤트 시작: ${this.eventStartTime.toISOString()}`);
    return true;
  }

  endEvent() {
    this.eventActive = false;
    console.log(`이벤트 종료: ${new Date().toISOString()}`);
    return true;
  }

  isEventActive(timestamp = Date.now()) {
    if (!this.eventActive || !this.eventStartTime || !this.eventEndTime) {
      return false;
    }
    return timestamp >= this.eventStartTime.getTime() && timestamp <= this.eventEndTime.getTime();
  }
}
