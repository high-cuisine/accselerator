export interface FileState {
  filePath: string;
  lastPosition: number; // Последняя позиция в файле (в байтах)
  lastSize: number; // Последний размер файла
  lastProcessed: string; // ISO дата последней обработки
  processedLines: number; // Количество обработанных строк
}

export interface LogReaderState {
  files: { [filePath: string]: FileState };
  lastUpdate: string; // ISO дата последнего обновления
}

