</div>
</div>
<footer class="footer footer-transparent d-print-none">
    <div class="container-xl">
        <div class="row text-center align-items-center flex-row-reverse">
            <div class="col-12 col-lg-auto mt-3 mt-lg-0">
                <ul class="list-inline list-inline-dots mb-0">
                    <li class="list-inline-item">
                        Copyright &copy; 2025
                        <a href="." class="link-secondary">Edoardo Fiore</a>.
                        All rights reserved.
                    </li>
                </ul>
            </div>
        </div>
    </div>
</footer>
</div>
</div>

<!-- Libs JS -->
<script src="https://cdn.jsdelivr.net/npm/@tabler/core@1.0.0-beta17/dist/js/tabler.min.js"></script>

<!-- Custom JS -->
<script src="js/utils.js"></script>
<?php if (isset($extra_scripts)) {
    foreach ($extra_scripts as $script) {
        echo '<script src="' . $script . '"></script>';
    }
} ?>
</body>

</html>