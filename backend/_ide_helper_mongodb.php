<?php

namespace MongoDB\BSON {
    class UTCDateTime {
        /**
         * @param int|float|string|\DateTimeInterface|null $milliseconds
         */
        public function __construct($milliseconds = null) {}

        /**
         * @return \DateTime
         */
        public function toDateTime() {}
    }
}

namespace MongoDB\Driver\Exception {
    class RuntimeException extends \RuntimeException {}
}
