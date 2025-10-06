using System.Collections;

namespace RealtimeAnalytics.Backend.DataStructures
{
    public sealed class CircularBuffer<T> : IEnumerable<T>
    {
        private readonly T[] _buffer;
        private readonly int _capacity;
        private readonly object _lock = new();
        private int _head;
        private int _tail;
        private int _count;

        public CircularBuffer(int capacity)
        {
            ArgumentOutOfRangeException.ThrowIfLessThanOrEqual(capacity, 0);
            _capacity = capacity;
            _buffer = new T[capacity];
        }

        public int Count
        {
            get
            {
                lock (_lock) return _count;
            }
        }

        public int Capacity => _capacity;

        public void Add(T item)
        {
            ArgumentNullException.ThrowIfNull(item);
            
            lock (_lock)
            {
                _buffer[_tail] = item;
                _tail = (_tail + 1) % _capacity;

                if (_count < _capacity)
                {
                    _count++;
                }
                else
                {
                    _head = (_head + 1) % _capacity;
                }
            }
        }

        public T[] GetItems()
        {
            lock (_lock)
            {
                var items = new T[_count];
                for (int i = 0; i < _count; i++)
                {
                    items[i] = _buffer[(_head + i) % _capacity];
                }
                return items;
            }
        }

        public void Clear()
        {
            lock (_lock)
            {
                _head = 0;
                _tail = 0;
                _count = 0;
            }
        }

        public IEnumerator<T> GetEnumerator() => GetItems().AsEnumerable().GetEnumerator();
        IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();
    }
}